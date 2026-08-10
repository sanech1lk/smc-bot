"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStageSocket } from "@/lib/use-stage-socket";
import { stampPhoto } from "@/lib/geo-stamp";
import { enqueueOutboxItem, getAllOutboxItems, type OutboxPhotoItem } from "@/lib/outbox";
import { useOutboxFlush } from "@/lib/use-outbox-flush";
import { Camera, Clock3, ImageIcon, MapPin, PenLine } from "lucide-react";
import { AnnotationOverlay, PhotoAnnotator } from "@/components/stage/photo-annotator";
import { EmptyState, SkeletonGrid } from "@/components/ui";
import type { PhotoSummary, PhotoTag } from "@/types/models";

const TAG_LABEL: Record<PhotoTag, string> = {
  BEFORE: "До",
  AFTER: "После",
  PROBLEM: "Проблема",
  CHECKED: "Проверено"
};

const TAG_COLOR: Record<PhotoTag, string> = {
  BEFORE: "bg-status-gray/20 text-text-secondary",
  AFTER: "bg-status-green/20 text-status-green",
  PROBLEM: "bg-status-red/20 text-status-red",
  CHECKED: "bg-brand/20 text-brand-light"
};

interface PendingPhoto {
  id: string;
  blobUrl: string;
  tag: PhotoTag;
}

export function PhotosPanel({ stageId }: { stageId: string }) {
  const [photos, setPhotos] = useState<PhotoSummary[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [filter, setFilter] = useState<PhotoTag | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTag, setUploadTag] = useState<PhotoTag>("BEFORE");
  const [preview, setPreview] = useState<PhotoSummary | null>(null);
  const [annotating, setAnnotating] = useState<PhotoSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const socket = useStageSocket(stageId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const url = filter === "ALL" ? `/api/stages/${stageId}/photos` : `/api/stages/${stageId}/photos?tag=${filter}`;
      const res = await fetch(url);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setPhotos(data.photos);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId, filter]);

  // Restore any photos that were queued offline in a previous session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await getAllOutboxItems();
      if (cancelled) return;
      const restored = items
        .filter((i): i is OutboxPhotoItem => i.kind === "photo" && i.stageId === stageId)
        .map((i) => ({ id: i.id, blobUrl: URL.createObjectURL(i.blob), tag: i.tag as PhotoTag }));
      setPendingPhotos(restored);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  useEffect(() => {
    function onNew(photo: PhotoSummary) {
      setPhotos((prev) => (prev.some((p) => p.id === photo.id) ? prev : [photo, ...prev]));
    }
    function onDeleted({ id }: { id: string }) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    }
    socket.on("photo:new", onNew);
    socket.on("photo:deleted", onDeleted);
    return () => {
      socket.off("photo:new", onNew);
      socket.off("photo:deleted", onDeleted);
    };
  }, [socket]);

  useOutboxFlush({
    onPhotoSent: (item, saved) => {
      if (item.stageId !== stageId) return;
      setPendingPhotos((prev) => {
        const match = prev.find((p) => p.id === item.id);
        if (match) URL.revokeObjectURL(match.blobUrl);
        return prev.filter((p) => p.id !== item.id);
      });
      const savedPhoto = saved as PhotoSummary;
      setPhotos((prev) => (prev.some((p) => p.id === savedPhoto.id) ? prev : [savedPhoto, ...prev]));
    }
  });

  const visiblePhotos = filter === "ALL" ? photos : photos.filter((p) => p.tag === filter);
  const visiblePending = filter === "ALL" ? pendingPhotos : pendingPhotos.filter((p) => p.tag === filter);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let stamped;
      try {
        // Burn a date + GPS-coordinate stamp into the photo before it ever
        // leaves the device — same idea as CompanyCam, makes the image
        // tamper-evident site proof even if it's later shared outside the app.
        stamped = await stampPhoto(file);
      } catch {
        alert("Не удалось обработать фото на этом устройстве");
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOffline(stamped);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", stamped.blob, "photo.jpg");
        formData.append("tag", uploadTag);
        if (stamped.lat != null) formData.append("lat", String(stamped.lat));
        if (stamped.lng != null) formData.append("lng", String(stamped.lng));
        if (stamped.accuracy != null) formData.append("accuracy", String(stamped.accuracy));

        const res = await fetch(`/api/stages/${stageId}/photos`, { method: "POST", body: formData });

        if (res.ok) {
          const data = await res.json();
          setPhotos((prev) => [data.photo, ...prev]);
        } else if (res.status >= 500) {
          await queueOffline(stamped);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error ?? "Не удалось загрузить фото");
        }
      } catch {
        // fetch threw — connection dropped mid-request. Queue it for later.
        await queueOffline(stamped);
        alert("Нет соединения — фото сохранено и загрузится, когда появится интернет");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveAnnotations(photo: PhotoSummary, annotations: string | null) {
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotations })
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? data.photo : p)));
      setPreview((prev) => (prev && prev.id === photo.id ? data.photo : prev));
    }
    setAnnotating(null);
  }

  async function queueOffline(stamped: { blob: Blob; lat: number | null; lng: number | null; accuracy: number | null }) {
    const id = `pending-${crypto.randomUUID()}`;
    const item: OutboxPhotoItem = {
      id,
      kind: "photo",
      stageId,
      blob: stamped.blob,
      tag: uploadTag,
      lat: stamped.lat,
      lng: stamped.lng,
      accuracy: stamped.accuracy,
      createdAt: Date.now()
    };
    await enqueueOutboxItem(item);
    setPendingPhotos((prev) => [...prev, { id, blobUrl: URL.createObjectURL(stamped.blob), tag: uploadTag }]);
  }

  return (
    <div className="px-4 py-4 pb-24 lg:pb-6">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="Все" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        {(Object.keys(TAG_LABEL) as PhotoTag[]).map((tag) => (
          <FilterChip key={tag} label={TAG_LABEL[tag]} active={filter === tag} onClick={() => setFilter(tag)} />
        ))}
      </div>

      <div className="mb-4 card space-y-3">
        <p className="font-semibold">Загрузить фото</p>
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(TAG_LABEL) as PhotoTag[]).map((tag) => (
            <button
              key={tag}
              onClick={() => setUploadTag(tag)}
              className={`chip flex-shrink-0 py-2 ${
                uploadTag === tag ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
              }`}
            >
              {TAG_LABEL[tag]}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="photo-input"
        />
        <label htmlFor="photo-input" className="btn-primary w-full cursor-pointer">
          <Camera size={18} />
          {uploading ? "Загружаем…" : "Сделать / выбрать фото"}
        </label>
      </div>

      {loading && <SkeletonGrid />}
      {!loading && visiblePhotos.length === 0 && visiblePending.length === 0 && (
        <EmptyState
          icon={ImageIcon}
          title="Нет фото с этим тегом"
          description="Снимки автоматически получают дату и координаты — их можно использовать как доказательство работ."
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visiblePending.map((photo) => (
          <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-bg-card opacity-60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.blobUrl} alt="Ожидает отправки" className="h-full w-full object-cover" />
            <span className="chip absolute left-1.5 top-1.5 gap-1 bg-black/65 py-0.5 text-xs text-white">
              <Clock3 size={11} />
              ждёт сети
            </span>
          </div>
        ))}
        {visiblePhotos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setPreview(photo)}
            className="relative aspect-square overflow-hidden rounded-xl bg-bg-card"
          >
            <Image src={photo.url} alt={photo.description ?? "Фото"} fill className="object-cover" sizes="200px" />
            <AnnotationOverlay annotations={photo.annotations} />
            <span className={`absolute left-1.5 top-1.5 chip py-0.5 text-xs ${TAG_COLOR[photo.tag]}`}>
              {TAG_LABEL[photo.tag]}
            </span>
          </button>
        ))}
      </div>

      {annotating && (
        <PhotoAnnotator
          photoUrl={annotating.url}
          initial={annotating.annotations}
          onCancel={() => setAnnotating(null)}
          onSave={(value) => saveAnnotations(annotating, value)}
        />
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative mx-auto my-auto h-[70vh] w-full max-w-lg">
            <Image src={preview.url} alt={preview.description ?? "Фото"} fill className="object-contain" />
            <AnnotationOverlay annotations={preview.annotations} />
          </div>
          <div className="mx-auto w-full max-w-lg text-center text-white">
            <span className={`chip ${TAG_COLOR[preview.tag]}`}>{TAG_LABEL[preview.tag]}</span>
            {preview.description && <p className="mt-2">{preview.description}</p>}
            <p className="mt-1 text-sm text-white/60">Загрузил: {preview.uploadedBy.name}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAnnotating(preview);
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <PenLine size={16} />
              {preview.annotations ? "Изменить разметку" : "Разметить фото"}
            </button>
            {preview.lat != null && preview.lng != null && (
              <a
                href={`https://maps.google.com/?q=${preview.lat},${preview.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-light underline"
              >
                <MapPin size={14} />
                Открыть место на карте
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip flex-shrink-0 py-2 ${active ? "bg-brand text-white" : "bg-bg-card text-text-secondary"}`}
    >
      {label}
    </button>
  );
}
