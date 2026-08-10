"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, FilePlus2, Plus, ScrollText, Trash2, X } from "lucide-react";
import { SignaturePad } from "@/components/stage/signature-pad";
import { formatAmount, getCurrency } from "@/lib/currency";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import type { ChangeOrderStatus, ChangeOrderSummary, ProjectRole, StageSummary } from "@/types/models";

const STATUS_LABEL: Record<ChangeOrderStatus, string> = {
  PENDING: "На согласовании",
  APPROVED: "Согласовано",
  REJECTED: "Отклонено"
};

const STATUS_CHIP: Record<ChangeOrderStatus, string> = {
  PENDING: "bg-status-yellow/15 text-status-yellow",
  APPROVED: "bg-status-green/15 text-status-green",
  REJECTED: "bg-status-red/15 text-status-red"
};

export function ChangeOrdersPanel({
  projectId,
  stages,
  myRole
}: {
  projectId: string;
  stages: StageSummary[];
  myRole: ProjectRole;
}) {
  const [orders, setOrders] = useState<ChangeOrderSummary[] | null>(null);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [currency, setCurrency] = useState("RUB");
  const [formOpen, setFormOpen] = useState(false);
  const [signing, setSigning] = useState<ChangeOrderSummary | null>(null);

  const canCreate = myRole !== "CLIENT";
  // The customer decides; an admin may record the decision on their behalf.
  const canDecide = myRole === "CLIENT" || myRole === "ADMIN";
  const symbol = getCurrency(currency).symbol;

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/change-orders`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setApprovedTotal(data.approvedTotal);
      setCurrency(data.currency);
    } else {
      setOrders([]);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(order: ChangeOrderSummary, status: "APPROVED" | "REJECTED", signature?: string) {
    const res = await fetch(`/api/change-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, signatureData: signature })
    });
    if (res.ok) {
      setSigning(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Не удалось сохранить решение");
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить допработу?")) return;
    const res = await fetch(`/api/change-orders/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Не удалось удалить");
    }
  }

  if (orders === null) return <SkeletonList rows={3} height="h-28" />;

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between">
        <div>
          <p className="label">Согласовано допработ</p>
          <p className="mt-1 text-2xl font-bold tabular text-brand">
            {formatAmount(approvedTotal, currency)} {symbol}
          </p>
        </div>
        <ScrollText size={26} className="text-text-muted" strokeWidth={1.75} />
      </div>

      {canCreate && (
        <button className="btn-secondary w-full" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? "Отмена" : "Новая допработа"}
        </button>
      )}

      {formOpen && (
        <NewChangeOrderForm
          projectId={projectId}
          stages={stages}
          currency={currency}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="Допработ пока нет"
          description="Когда заказчик просит что-то сверх сметы — оформите допработу, чтобы она была согласована и подписана, а не потерялась в чате."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted">Доп №{order.number}</p>
                  <p className="mt-0.5 font-semibold">{order.title}</p>
                </div>
                <span className={`chip flex-shrink-0 py-1 text-xs ${STATUS_CHIP[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              {order.description && (
                <p className="mt-1.5 text-sm text-text-secondary">{order.description}</p>
              )}

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-lg font-bold tabular">
                  {formatAmount(order.amount, currency)} {symbol}
                </span>
                {order.stage && <span className="text-sm text-text-muted">{order.stage.name}</span>}
              </div>

              <p className="mt-1.5 text-xs text-text-muted">
                {order.createdBy.name} · {format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })}
                {order.decidedBy && order.decidedAt
                  ? ` → ${order.decidedBy.name}, ${format(new Date(order.decidedAt), "d MMM", { locale: ru })}`
                  : ""}
              </p>

              {order.signatureData && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.signatureData}
                    alt="Подпись заказчика"
                    className="h-10 w-20 rounded-lg bg-bg-soft object-contain"
                  />
                  <span className="text-xs text-text-muted">Подпись заказчика</span>
                </div>
              )}

              {order.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  {canDecide && (
                    <>
                      <button className="btn-primary flex-1 py-2.5 text-sm" onClick={() => setSigning(order)}>
                        <Check size={16} />
                        Согласовать
                      </button>
                      <button
                        className="btn-secondary flex-1 py-2.5 text-sm"
                        onClick={() => decide(order, "REJECTED")}
                      >
                        Отклонить
                      </button>
                    </>
                  )}
                  {myRole === "ADMIN" && (
                    <button
                      onClick={() => remove(order.id)}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-text-muted hover:text-status-red"
                      aria-label="Удалить допработу"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {signing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setSigning(null)}
        >
          <div
            className="animate-sheet w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-5 shadow-overlay sm:my-8 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Согласование допработы №{signing.number}</h3>
            <p className="mt-1 text-text-secondary">{signing.title}</p>
            <p className="mt-2 text-xl font-bold tabular text-brand">
              {formatAmount(signing.amount, currency)} {symbol}
            </p>
            <p className="mt-3 mb-2 text-sm text-text-secondary">
              Распишитесь пальцем — подпись сохранится вместе с суммой и датой.
            </p>
            <SignaturePad onSave={(dataUrl) => decide(signing, "APPROVED", dataUrl)} />
            <button className="btn-ghost mt-3 w-full" onClick={() => setSigning(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewChangeOrderForm({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [stageId, setStageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbol = getCurrency(currency).symbol;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/change-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        amount: Number(amount) || 0,
        stageId: stageId || undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось создать допработу");
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card space-y-3">
      <input
        className="input"
        placeholder="Что за работа (например «Перенос розетки»)"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input"
        rows={2}
        placeholder="Подробности (необязательно)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder={`Сумма, ${symbol}`}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">Без этапа</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Создаём…" : "Отправить на согласование"}
      </button>
    </form>
  );
}
