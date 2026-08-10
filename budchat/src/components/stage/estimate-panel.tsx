"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { BarChart3, FileDown, History, LayoutTemplate, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useStageSocket } from "@/lib/use-stage-socket";
import { formatAmount, getCurrency } from "@/lib/currency";
import { EmptyState, ErrorNote, Skeleton, SkeletonList, SkeletonTable } from "@/components/ui";
import type { EstimateHistoryEntry, EstimateItem, ProjectRole } from "@/types/models";

const ACTION_LABEL: Record<EstimateHistoryEntry["action"], string> = {
  created: "Добавлено",
  updated: "Изменено",
  deleted: "Удалено"
};

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  suggested: boolean;
  total: number;
}

export function EstimatePanel({
  stageId,
  stageName,
  myRole
}: {
  stageId: string;
  stageName: string;
  myRole: ProjectRole;
}) {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [currency, setCurrency] = useState("RUB");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<EstimateHistoryEntry[]>([]);
  const socket = useStageSocket(stageId);
  const canEdit = myRole !== "CLIENT";
  const symbol = getCurrency(currency).symbol;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stages/${stageId}/estimate`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setItems(data.items);
        setCurrency(data.currency ?? "RUB");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  useEffect(() => {
    function onNew(item: EstimateItem) {
      setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
    }
    function onUpdated(item: EstimateItem) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
    function onDeleted({ id }: { id: string }) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    socket.on("estimate:new", onNew);
    socket.on("estimate:updated", onUpdated);
    socket.on("estimate:deleted", onDeleted);
    return () => {
      socket.off("estimate:new", onNew);
      socket.off("estimate:updated", onUpdated);
      socket.off("estimate:deleted", onDeleted);
    };
  }, [socket]);

  async function loadHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    const res = await fetch(`/api/stages/${stageId}/estimate/history`);
    if (res.ok) setHistory((await res.json()).history);
    setHistoryOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить позицию сметы?")) return;
    const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const total = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <div className="px-4 py-4 pb-24 lg:pb-6">
      <div className="card mb-3 flex items-center justify-between">
        <div>
          <p className="label">Итого по этапу</p>
          {/* Until the fetch resolves we don't know the amount or even the
              currency, so show a placeholder rather than a misleading "0". */}
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-32" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand">
              {formatAmount(total, currency)} {symbol}
            </p>
          )}
        </div>
        <BarChart3 size={28} className="text-text-muted" strokeWidth={1.75} />
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Смета пуста"
          description={
            canEdit
              ? "Добавьте позиции вручную или возьмите готовый шаблон по типу работ."
              : "Подрядчик ещё не заполнил смету этого этапа."
          }
        />
      ) : (
        <div className="card mb-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-text-muted">
                <th className="pb-2 font-semibold">Наименование</th>
                <th className="pb-2 font-semibold">Ед.</th>
                <th className="pb-2 text-right font-semibold">Кол-во</th>
                <th className="pb-2 text-right font-semibold">Цена</th>
                <th className="pb-2 text-right font-semibold">Сумма</th>
                {canEdit && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border-soft">
                  <td className="py-2.5 pr-2">{item.itemName}</td>
                  <td className="py-2.5 pr-2 text-text-secondary">{item.unit}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {formatAmount(item.quantity, currency)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {formatAmount(item.unitPrice, currency)}
                  </td>
                  <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">
                    {formatAmount(item.totalPrice, currency)}
                  </td>
                  {canEdit && (
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-text-muted transition-colors hover:text-status-red"
                        aria-label={`Удалить ${item.itemName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={4} className="py-2.5 font-bold">
                  Итого
                </td>
                <td className="py-2.5 text-right text-base font-bold tabular-nums text-brand">
                  {formatAmount(total, currency)} {symbol}
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {canEdit && (
          <>
            <button className="btn-secondary" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? <X size={17} /> : <Plus size={17} />}
              {formOpen ? "Отмена" : "Позиция"}
            </button>
            <button className="btn-secondary" onClick={() => setTemplatesOpen((v) => !v)}>
              <LayoutTemplate size={17} />
              Шаблон
            </button>
          </>
        )}
        <button className="btn-ghost border border-border" onClick={loadHistory}>
          <History size={17} />
          История
        </button>
        <a
          href={`/api/stages/${stageId}/estimate/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost border border-border"
        >
          <FileDown size={17} />
          PDF
        </a>
      </div>

      {formOpen && (
        <NewEstimateForm
          stageId={stageId}
          currency={currency}
          onCreated={(item) => setItems((prev) => [...prev, item])}
        />
      )}

      {templatesOpen && (
        <TemplatePicker
          stageId={stageId}
          stageName={stageName}
          currency={currency}
          onApplied={(added) => {
            setItems((prev) => [...prev, ...added]);
            setTemplatesOpen(false);
          }}
        />
      )}

      {historyOpen && (
        <div className="animate-in mt-4">
          <p className="label mb-2">История изменений</p>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-text-secondary">Изменений пока нет</p>}
            {history.map((h) => (
              <div key={h.id} className="card py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{h.itemName}</span>
                  <span className="flex-shrink-0 text-sm text-text-secondary">{ACTION_LABEL[h.action]}</span>
                </div>
                <p className="text-sm text-text-secondary">
                  {formatAmount(h.quantity, currency)} {h.unit} × {formatAmount(h.unitPrice, currency)} ={" "}
                  {formatAmount(h.totalPrice, currency)} {symbol}
                </p>
                <p className="text-xs text-text-muted">
                  {h.changedBy.name} · {format(new Date(h.changedAt), "dd.MM.yyyy HH:mm")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatePicker({
  stageId,
  stageName,
  currency,
  onApplied
}: {
  stageId: string;
  stageName: string;
  currency: string;
  onApplied: (items: EstimateItem[]) => void;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const symbol = getCurrency(currency).symbol;

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/stages/${stageId}/estimate/apply-template`);
      if (res.ok) setTemplates((await res.json()).templates);
      else setTemplates([]);
    })();
  }, [stageId]);

  async function apply(templateId: string) {
    setApplying(templateId);
    const res = await fetch(`/api/stages/${stageId}/estimate/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId })
    });
    setApplying(null);
    if (res.ok) {
      const data = await res.json();
      onApplied(data.items);
    }
  }

  return (
    <div className="animate-in mt-3">
      <p className="label mb-2">Шаблоны для «{stageName}»</p>
      {templates === null ? (
        <SkeletonList rows={3} height="h-20" />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {t.suggested && <Sparkles size={14} className="flex-shrink-0 text-brand" />}
                    <span className="truncate">{t.name}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">{t.description}</p>
                </div>
                <span className="flex-shrink-0 text-sm tabular-nums text-text-muted">
                  {t.itemCount} поз.
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">
                  ≈ {formatAmount(t.total, currency)} {symbol}
                </span>
                <button
                  className="btn-secondary px-4 py-2 text-sm"
                  onClick={() => apply(t.id)}
                  disabled={applying !== null}
                >
                  {applying === t.id ? "Добавляем…" : "Применить"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-text-muted">
        Позиции добавляются к текущей смете — количество и цены после этого можно поправить.
      </p>
    </div>
  );
}

function NewEstimateForm({
  stageId,
  currency,
  onCreated
}: {
  stageId: string;
  currency: string;
  onCreated: (item: EstimateItem) => void;
}) {
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("шт");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const symbol = getCurrency(currency).symbol;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/stages/${stageId}/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName,
        unit,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice)
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось добавить позицию");
      return;
    }

    const data = await res.json();
    onCreated(data.item);
    setItemName("");
    setUnit("шт");
    setQuantity("1");
    setUnitPrice("0");
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card mt-3 space-y-3">
      <input
        className="input"
        placeholder="Наименование работ/материала"
        required
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-2">
        <input className="input" placeholder="Ед." value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Кол-во"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Цена"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
        />
      </div>
      <p className="text-text-secondary">
        Сумма:{" "}
        <span className="font-semibold tabular-nums text-text-primary">
          {formatAmount(total, currency)} {symbol}
        </span>
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        <Plus size={18} />
        {loading ? "Добавляем…" : "Добавить в смету"}
      </button>
    </form>
  );
}
