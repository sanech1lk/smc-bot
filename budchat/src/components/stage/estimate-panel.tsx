"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useStageSocket } from "@/lib/use-stage-socket";
import type { EstimateHistoryEntry, EstimateItem, ProjectRole } from "@/types/models";

const ACTION_LABEL: Record<EstimateHistoryEntry["action"], string> = {
  created: "Добавлено",
  updated: "Изменено",
  deleted: "Удалено"
};

export function EstimatePanel({ stageId, myRole }: { stageId: string; myRole: ProjectRole }) {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<EstimateHistoryEntry[]>([]);
  const socket = useStageSocket(stageId);
  const canEdit = myRole !== "CLIENT";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stages/${stageId}/estimate`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setItems(data.items);
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
    const res = await fetch(`/api/stages/${stageId}/estimate/history`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history);
    }
    setHistoryOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить позицию сметы?")) return;
    const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const total = items.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <div className="px-4 py-4">
      <div className="card mb-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="text-sm text-text-secondary">
              <th className="pb-2">Наименование</th>
              <th className="pb-2">Ед.</th>
              <th className="pb-2 text-right">Кол-во</th>
              <th className="pb-2 text-right">Цена</th>
              <th className="pb-2 text-right">Сумма</th>
              {canEdit && <th className="pb-2" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border-soft">
                <td className="py-2 pr-2">{item.itemName}</td>
                <td className="py-2 pr-2 text-text-secondary">{item.unit}</td>
                <td className="py-2 pr-2 text-right">{item.quantity}</td>
                <td className="py-2 pr-2 text-right">{formatMoney(item.unitPrice)}</td>
                <td className="py-2 pr-2 text-right font-semibold">{formatMoney(item.totalPrice)}</td>
                {canEdit && (
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-status-red"
                      aria-label="Удалить позицию"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-text-secondary">
                  {loading ? "Загрузка…" : "Смета пуста"}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={canEdit ? 4 : 4} className="py-2 font-bold">
                Итого
              </td>
              <td className="py-2 text-right text-lg font-bold text-brand-light">{formatMoney(total)} ₽</td>
              {canEdit && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2">
        {canEdit && (
          <button className="btn-secondary flex-1" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "Отмена" : "+ Позиция"}
          </button>
        )}
        <button className="btn-ghost flex-1 border border-border-soft" onClick={loadHistory}>
          История изменений
        </button>
      </div>

      {formOpen && <NewEstimateForm stageId={stageId} onCreated={(item) => setItems((prev) => [...prev, item])} />}

      {historyOpen && (
        <div className="mt-4">
          <p className="mb-2 font-semibold">История изменений</p>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-text-secondary">Изменений пока нет</p>}
            {history.map((h) => (
              <div key={h.id} className="card py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{h.itemName}</span>
                  <span className="text-sm text-text-secondary">{ACTION_LABEL[h.action]}</span>
                </div>
                <p className="text-sm text-text-secondary">
                  {h.quantity} {h.unit} × {formatMoney(h.unitPrice)} = {formatMoney(h.totalPrice)} ₽
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

function NewEstimateForm({ stageId, onCreated }: { stageId: string; onCreated: (item: EstimateItem) => void }) {
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("шт");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0);

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
    <form onSubmit={handleSubmit} className="card mt-3 space-y-3">
      <input className="input" placeholder="Наименование работ/материала" required value={itemName} onChange={(e) => setItemName(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input" placeholder="Ед." value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Кол-во" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Цена" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
      </div>
      <p className="text-text-secondary">
        Сумма: <span className="font-semibold text-text-primary">{formatMoney(total)} ₽</span>
      </p>
      {error && <p className="rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Добавляем…" : "Добавить в смету"}
      </button>
    </form>
  );
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}
