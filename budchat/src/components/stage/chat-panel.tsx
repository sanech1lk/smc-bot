"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useStageSocket } from "@/lib/use-stage-socket";
import type { MessageSummary } from "@/types/models";

export function ChatPanel({ stageId, currentUserId }: { stageId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useStageSocket(stageId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stages/${stageId}/messages`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setMessages(data.messages);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  useEffect(() => {
    function onNew(message: MessageSummary) {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");
    const res = await fetch(`/api/stages/${stageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type: "TEXT" })
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-11.5rem)] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {loading && <p className="text-center text-text-secondary">Загрузка сообщений…</p>}
        {!loading && messages.length === 0 && (
          <p className="mt-8 text-center text-text-secondary">Пока нет сообщений. Начните обсуждение этапа.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  mine ? "bg-brand text-white" : "bg-bg-card text-text-primary"
                }`}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold text-brand-light">{m.sender.name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-right text-xs ${mine ? "text-white/70" : "text-text-muted"}`}>
                  {format(new Date(m.createdAt), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="bottom-nav-safe flex gap-2 border-t border-border px-3 py-3">
        <input
          className="input flex-1"
          placeholder="Сообщение…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary aspect-square !px-0 w-14"
          disabled={sending || !text.trim()}
          aria-label="Отправить"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
