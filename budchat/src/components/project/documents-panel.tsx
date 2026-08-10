"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import type { DocumentCategory, DocumentSummary, ProjectRole } from "@/types/models";

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  CONTRACT: "Договор",
  DRAWING: "Чертёж",
  CERTIFICATE: "Сертификат",
  INVOICE: "Счёт",
  OTHER: "Прочее"
};

const CATEGORY_CHIP: Record<DocumentCategory, string> = {
  CONTRACT: "bg-brand/15 text-brand",
  DRAWING: "bg-accent/12 text-accent",
  CERTIFICATE: "bg-status-green/15 text-status-green",
  INVOICE: "bg-status-yellow/15 text-status-yellow",
  OTHER: "bg-bg-elevated text-text-secondary"
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function DocumentsPanel({ projectId, myRole }: { projectId: string; myRole: ProjectRole }) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("CONTRACT");
  const [filter, setFilter] = useState<DocumentCategory | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = myRole !== "CLIENT";

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/documents`);
    setDocuments(res.ok ? (await res.json()).documents : []);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const res = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: formData });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось загрузить документ");
      return;
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Удалить документ?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (documents === null) return <SkeletonList rows={3} height="h-20" />;

  const visible = filter === "ALL" ? documents : documents.filter((d) => d.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("ALL")}
          className={`chip flex-shrink-0 py-2 ${
            filter === "ALL" ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
          }`}
        >
          Все
        </button>
        {(Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`chip flex-shrink-0 py-2 ${
              filter === c ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
            }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {canEdit && (
        <div className="card space-y-3">
          <p className="font-semibold">Загрузить документ</p>
          <div className="flex gap-2 overflow-x-auto">
            {(Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`chip flex-shrink-0 py-2 ${
                  category === c ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
            id="document-input"
          />
          <label htmlFor="document-input" className="btn-primary w-full cursor-pointer">
            <Upload size={18} />
            {uploading ? "Загружаем…" : "Выбрать файл"}
          </label>
          {error && <ErrorNote>{error}</ErrorNote>}
          <p className="text-xs text-text-muted">PDF, Word, Excel или изображение, до 25 МБ.</p>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Документов нет"
          description={canEdit ? "Договоры, чертежи в PDF и сертификаты на материалы — всё в одном месте." : undefined}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((doc) => (
            <div key={doc.id} className="card flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-text-secondary">
                <FileText size={20} />
              </span>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1"
              >
                <p className="truncate font-semibold">{doc.name}</p>
                <p className="truncate text-sm text-text-secondary">
                  {formatSize(doc.sizeBytes)} · {doc.uploadedBy.name} ·{" "}
                  {format(new Date(doc.createdAt), "d MMM yyyy", { locale: ru })}
                </p>
              </a>
              <span className={`chip flex-shrink-0 py-1 text-xs ${CATEGORY_CHIP[doc.category]}`}>
                {CATEGORY_LABEL[doc.category]}
              </span>
              {canEdit && (
                <button
                  onClick={() => remove(doc.id)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                  aria-label={`Удалить ${doc.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
