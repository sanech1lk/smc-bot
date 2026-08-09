"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useStageSocket } from "@/lib/use-stage-socket";
import { SignaturePad } from "@/components/stage/signature-pad";
import type { ChecklistItemSummary, ProjectRole, SignatureSummary } from "@/types/models";

export function ChecklistPanel({
  stageId,
  myRole,
  currentUserName
}: {
  stageId: string;
  myRole: ProjectRole;
  currentUserName: string;
}) {
  const [items, setItems] = useState<ChecklistItemSummary[]>([]);
  const [signatures, setSignatures] = useState<SignatureSummary[]>([]);
  const [newText, setNewText] = useState("");
  const [signerName, setSignerName] = useState(currentUserName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useStageSocket(stageId);
  const canEditList = myRole !== "CLIENT";

  useEffect(() => {
    (async () => {
      const [itemsRes, sigRes] = await Promise.all([
        fetch(`/api/stages/${stageId}/checklist`),
        fetch(`/api/stages/${stageId}/signature`)
      ]);
      if (itemsRes.ok) setItems((await itemsRes.json()).items);
      if (sigRes.ok) setSignatures((await sigRes.json()).signatures);
    })();
  }, [stageId]);

  useEffect(() => {
    function onNew(item: ChecklistItemSummary) {
      setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
    }
    function onUpdated(item: ChecklistItemSummary) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
    function onDeleted({ id }: { id: string }) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    function onSignature(sig: SignatureSummary) {
      setSignatures((prev) => [sig, ...prev]);
    }
    socket.on("checklist:new", onNew);
    socket.on("checklist:updated", onUpdated);
    socket.on("checklist:deleted", onDeleted);
    socket.on("signature:new", onSignature);
    return () => {
      socket.off("checklist:new", onNew);
      socket.off("checklist:updated", onUpdated);
      socket.off("checklist:deleted", onDeleted);
      socket.off("signature:new", onSignature);
    };
  }, [socket]);

  async function toggle(item: ChecklistItemSummary) {
    const res = await fetch(`/api/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked })
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newText.trim()) return;
    const res = await fetch(`/api/stages/${stageId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim() })
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setNewText("");
    }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/checklist/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSignature(dataUrl: string) {
    setError(null);
    if (!signerName.trim()) {
      setError("Введите имя подписавшего");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/stages/${stageId}/signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName: signerName.trim(), imageData: dataUrl })
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось сохранить подпись");
      return;
    }
    const data = await res.json();
    setSignatures((prev) => [data.signature, ...prev]);
  }

  const allChecked = items.length > 0 && items.every((i) => i.checked);

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-text-secondary">
        Отметьте пункты приёмки этапа. Когда всё готово — заказчик подписывает акт пальцем на экране.
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="card flex items-center gap-3">
            <button
              onClick={() => toggle(item)}
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border-2 text-lg ${
                item.checked ? "border-status-green bg-status-green/20 text-status-green" : "border-border-soft"
              }`}
              aria-label={item.checked ? "Снять отметку" : "Отметить выполненным"}
            >
              {item.checked ? "✓" : ""}
            </button>
            <span className={`flex-1 ${item.checked ? "text-text-secondary line-through" : ""}`}>{item.text}</span>
            {canEditList && (
              <button
                onClick={() => handleRemove(item.id)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-status-red active:bg-status-red/10"
                aria-label="Удалить пункт"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-text-secondary">Чек-лист пуст</p>}
      </div>

      {canEditList && (
        <form onSubmit={handleAdd} className="mt-3 flex gap-2">
          <input className="input flex-1" placeholder="Новый пункт чек-листа" value={newText} onChange={(e) => setNewText(e.target.value)} />
          <button type="submit" className="btn-secondary">
            +
          </button>
        </form>
      )}

      <div className="card mt-6">
        <p className="mb-3 font-semibold">Подпись заказчика (приёмка этапа)</p>
        {!allChecked && (
          <p className="mb-3 rounded-xl bg-status-yellow/10 px-3 py-2 text-sm text-status-yellow">
            Не все пункты чек-листа отмечены — подпись всё равно можно поставить, если заказчик согласен.
          </p>
        )}
        <input
          className="input mb-3"
          placeholder="ФИО подписавшего"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
        />
        {error && <p className="mb-3 rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>}
        <SignaturePad onSave={handleSignature} />
        {saving && <p className="mt-2 text-center text-text-secondary">Сохраняем подпись…</p>}
      </div>

      {signatures.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-semibold">История подписей</p>
          {signatures.map((sig) => (
            <div key={sig.id} className="card flex items-center gap-3">
              <img src={sig.imageData} alt="Подпись" className="h-12 w-24 rounded-lg bg-bg-soft object-contain" />
              <div>
                <p className="font-semibold">{sig.signerName}</p>
                <p className="text-sm text-text-muted">{format(new Date(sig.createdAt), "dd.MM.yyyy HH:mm")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
