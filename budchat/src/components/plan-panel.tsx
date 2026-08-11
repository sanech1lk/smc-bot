"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { AlertCircle, Check, Map as MapIcon, Plus, Trash2, Upload } from "lucide-react";
import { EmptyState, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { bcp47Tag } from "@/lib/i18n";
import type { PlanPinSummary, PlanSummary, ProjectRole, StageSummary } from "@/types/models";

export function PlanPanel({
  projectId,
  stages,
  myRole
}: {
  projectId: string;
  stages: StageSummary[];
  myRole: ProjectRole;
}) {
  const { t, locale } = useLocale();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [pins, setPins] = useState<PlanPinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<PlanPinSummary | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canManage = myRole === "ADMIN" || myRole === "WORKER";

  const loadPlans = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/plans`);
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans);
      if (data.plans.length > 0) {
        setActivePlanId((prev) => prev ?? data.plans[0].id);
      }
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const loadPins = useCallback(async () => {
    if (!activePlanId) {
      setPins([]);
      return;
    }
    const res = await fetch(`/api/plans/${activePlanId}/pins`);
    if (res.ok) {
      const data = await res.json();
      setPins(data.pins);
    }
  }, [activePlanId]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const defaultName = t("plan.defaultName");
    const name = prompt(t("plan.namePrompt"), defaultName) ?? defaultName;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    const res = await fetch(`/api/projects/${projectId}/plans`, { method: "POST", body: formData });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    if (res.ok) {
      const data = await res.json();
      setPlans((prev) => [...prev, data.plan]);
      setActivePlanId(data.plan.id);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("plan.errorUpload"));
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canManage || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPoint({ x, y });
  }

  async function handleCreatePin(title: string, description: string, stageId: string) {
    if (!activePlanId || !pendingPoint) return;
    const res = await fetch(`/api/plans/${activePlanId}/pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x: pendingPoint.x,
        y: pendingPoint.y,
        title,
        description: description || undefined,
        stageId: stageId || undefined
      })
    });
    if (res.ok) {
      const data = await res.json();
      setPins((prev) => [...prev, data.pin]);
      setPendingPoint(null);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("plan.errorAddPin"));
    }
  }

  async function toggleResolved(pin: PlanPinSummary) {
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: pin.status === "OPEN" ? "RESOLVED" : "OPEN" })
    });
    if (res.ok) {
      const data = await res.json();
      setPins((prev) => prev.map((p) => (p.id === pin.id ? data.pin : p)));
      setSelectedPin(data.pin);
    }
  }

  async function deletePin(pin: PlanPinSummary) {
    if (!confirm(t("plan.deletePinConfirm"))) return;
    const res = await fetch(`/api/pins/${pin.id}`, { method: "DELETE" });
    if (res.ok) {
      setPins((prev) => prev.filter((p) => p.id !== pin.id));
      setSelectedPin(null);
    }
  }

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  if (loading) {
    return (
      <div className="px-4 py-4 pb-6">
        <SkeletonList rows={2} height="h-48" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {plans.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={`chip flex-shrink-0 py-2 ${
                plan.id === activePlanId ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
              }`}
            >
              {plan.name} ({plan._count?.pins ?? 0})
            </button>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mb-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" id="plan-input" />
          <label htmlFor="plan-input" className="btn-secondary block w-full cursor-pointer text-center">
            {uploading ? (
              t("plan.uploading")
            ) : (
              <>
                {plans.length === 0 ? <Upload size={18} /> : <Plus size={18} />}
                {plans.length === 0 ? t("plan.uploadFirst") : t("plan.uploadMore")}
              </>
            )}
          </label>
        </div>
      )}

      {!activePlan && plans.length === 0 && (
        <EmptyState icon={MapIcon} title={t("plan.emptyTitle")} description={t("plan.emptyDescription")} />
      )}

      {activePlan && (
        <>
          <p className="mb-2 text-sm text-text-secondary">
            {canManage ? t("plan.hintManage") : t("plan.hintView")}
          </p>
          <div
            ref={imageRef}
            onClick={handleImageClick}
            className="relative w-full overflow-hidden rounded-xl border border-border-soft bg-bg-soft"
            style={{ cursor: canManage ? "crosshair" : "default" }}
          >
            <Image
              src={activePlan.url}
              alt={activePlan.name}
              width={1200}
              height={1200}
              className="h-auto w-full select-none"
              sizes="600px"
              priority
            />
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                }}
                className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${
                  pin.status === "OPEN" ? "bg-status-red" : "bg-status-green"
                }`}
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                aria-label={pin.title}
              >
                {pin.status === "OPEN" ? <AlertCircle size={15} /> : <Check size={15} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </>
      )}

      {pendingPoint && (
        <NewPinForm
          stages={stages}
          onCancel={() => setPendingPoint(null)}
          onSubmit={handleCreatePin}
        />
      )}

      {selectedPin && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setSelectedPin(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-border-soft bg-bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold">{selectedPin.title}</h3>
              <span
                className={`chip flex-shrink-0 text-xs ${
                  selectedPin.status === "OPEN"
                    ? "bg-status-red/20 text-status-red"
                    : "bg-status-green/20 text-status-green"
                }`}
              >
                {selectedPin.status === "OPEN" ? t("plan.statusOpen") : t("plan.statusResolved")}
              </span>
            </div>
            {selectedPin.description && <p className="text-text-secondary">{selectedPin.description}</p>}
            {selectedPin.stage && (
              <p className="mt-2 text-sm text-text-muted">
                {t("plan.stagePrefix")} {selectedPin.stage.name}
              </p>
            )}
            <p className="mt-1 text-sm text-text-muted">
              {selectedPin.createdBy.name} ·{" "}
              {new Date(selectedPin.createdAt).toLocaleDateString(bcp47Tag(locale))}
            </p>
            {myRole !== "CLIENT" && (
              <div className="mt-4 flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => toggleResolved(selectedPin)}>
                  {selectedPin.status === "OPEN" ? t("plan.markResolved") : t("plan.reopen")}
                </button>
                <button
                  className="btn-danger px-4"
                  onClick={() => deletePin(selectedPin)}
                  aria-label={t("plan.deletePinAria")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NewPinForm({
  stages,
  onCancel,
  onSubmit
}: {
  stages: StageSummary[];
  onCancel: () => void;
  onSubmit: (title: string, description: string, stageId: string) => void;
}) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim(), stageId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-border-soft bg-bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-lg font-bold">{t("plan.newPinTitle")}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            placeholder={t("plan.titlePlaceholder")}
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input"
            placeholder={t("plan.descriptionPlaceholder")}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">{t("plan.noStage")}</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary flex-1">
              {t("plan.submitPin")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
