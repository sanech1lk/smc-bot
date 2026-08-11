"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Package, Plus, Trash2, X } from "lucide-react";
import { formatAmount, getCurrency } from "@/lib/currency";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { materialOverrun, materialProgressPercent } from "@/lib/field-ops";
import type { MaterialSummary, ProjectRole, StageSummary } from "@/types/models";

export function MaterialsPanel({
  projectId,
  stages,
  myRole
}: {
  projectId: string;
  stages: StageSummary[];
  myRole: ProjectRole;
}) {
  const { t } = useLocale();
  const [materials, setMaterials] = useState<MaterialSummary[] | null>(null);
  const [plannedCost, setPlannedCost] = useState(0);
  const [usedCost, setUsedCost] = useState(0);
  const [currency, setCurrency] = useState("RUB");
  const [formOpen, setFormOpen] = useState(false);
  const canEdit = myRole !== "CLIENT";
  const symbol = getCurrency(currency).symbol;

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/materials`);
    if (res.ok) {
      const data = await res.json();
      setMaterials(data.materials);
      setPlannedCost(data.plannedCost);
      setUsedCost(data.usedCost);
      setCurrency(data.currency);
    } else {
      setMaterials([]);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Inline edit of the consumed quantity — the field crews touch most. */
  async function setUsed(material: MaterialSummary, quantityUsed: number) {
    const res = await fetch(`/api/materials/${material.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityUsed })
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm(t("materials.deleteConfirm"))) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (materials === null) return <SkeletonList rows={3} height="h-24" />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="label">{t("materials.plannedLabel")}</p>
          <p className="mt-1.5 text-xl font-bold tabular">
            {formatAmount(plannedCost, currency)} {symbol}
          </p>
        </div>
        <div className="card">
          <p className="label">{t("materials.usedLabel")}</p>
          <p
            className={`mt-1.5 text-xl font-bold tabular ${
              usedCost > plannedCost ? "text-status-red" : "text-text-primary"
            }`}
          >
            {formatAmount(usedCost, currency)} {symbol}
          </p>
        </div>
      </div>

      {canEdit && (
        <button className="btn-secondary w-full" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? t("common.cancel") : t("materials.addCta")}
        </button>
      )}

      {formOpen && (
        <NewMaterialForm
          projectId={projectId}
          stages={stages}
          currency={currency}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}

      {materials.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("materials.emptyTitle")}
          description={canEdit ? t("materials.emptyDescription") : undefined}
        />
      ) : (
        <div className="space-y-2">
          {materials.map((m) => {
            const over = materialOverrun(m);
            const percent = materialProgressPercent(m);
            return (
              <div key={m.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="text-sm text-text-secondary">
                      {formatAmount(m.unitPrice, currency)} {symbol} / {m.unit}
                      {m.supplier ? ` · ${m.supplier}` : ""}
                      {m.stage ? ` · ${m.stage.name}` : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => remove(m.id)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                      aria-label={t("materials.deleteAria", { name: m.name })}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over ? "bg-status-red" : "bg-status-green"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={`text-sm tabular ${over ? "text-status-red" : "text-text-secondary"}`}>
                    {m.quantityUsed} / {m.quantityPlanned} {m.unit}
                  </span>
                </div>

                {canEdit && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className="text-sm text-text-muted">{t("materials.usedFieldLabel")}</label>
                    <input
                      className="input w-28 py-2 text-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={m.quantityUsed}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isNaN(value) && value !== m.quantityUsed) setUsed(m, value);
                      }}
                    />
                    <span className="text-sm text-text-muted">{m.unit}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewMaterialForm({
  projectId,
  stages,
  currency,
  onCreated
}: {
  projectId: string;
  stages: StageSummary[];
  currency: string;
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("шт");
  const [quantityPlanned, setQuantityPlanned] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [stageId, setStageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbol = getCurrency(currency).symbol;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        unit,
        quantityPlanned: Number(quantityPlanned) || 0,
        unitPrice: Number(unitPrice) || 0,
        supplier: supplier || undefined,
        stageId: stageId || undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("materials.errorCreate"));
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card space-y-3">
      <input
        className="input"
        placeholder={t("materials.namePlaceholder")}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className="input"
          placeholder={t("materials.unitPlaceholder")}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder={t("materials.plannedPlaceholder")}
          value={quantityPlanned}
          onChange={(e) => setQuantityPlanned(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder={t("materials.pricePlaceholder", { symbol })}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
        />
      </div>
      <input
        className="input"
        placeholder={t("materials.supplierPlaceholder")}
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
      />
      <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
        <option value="">{t("materials.noStage")}</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? t("materials.submitCreating") : t("materials.submit")}
      </button>
    </form>
  );
}
