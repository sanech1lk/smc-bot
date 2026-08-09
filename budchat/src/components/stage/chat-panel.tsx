"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useStageSocket } from "@/lib/use-stage-socket";
import { MicButton } from "@/components/mic-button";
import { enqueueOutboxItem, getAllOutboxItems, type OutboxMessageItem } from "@/lib/outbox";
import { useOutboxFlush } from "@/lib/use-outbox-flush";
import type { MessageSummary } from "@/types/models";

type ChatMessage = MessageSummary & { pending?: boolean };

export function ChatPanel({ stageId, currentUserId }: { stageId: string; currentUserId: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useStageSocket(stageId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [res, outboxItems] = await Promise.all([
        fetch(`/api/stages/${stageId}/messages`),
        getAllOutboxItems()
      ]);
      if (cancelled) return;

      const pending: ChatMessage[] = outboxItems
        .filter((i): i is OutboxMessageItem => i.kind === "message" && i.stageId === stageId)
        .map((i) => ({
          id: i.id,
          stageId: i.stageId,
          content: i.content,
          type: "TEXT",
          createdAt: new Date(i.createdAt).toISOString(),
          sender: { id: currentUserId, name: session?.user.name ?? "Вы" },
          pending: true
        }));

      if (res.ok) {
        const data = await res.json();
        setMessages([...data.messages, ...pending]);
      } else {
        setMessages(pending);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useOutboxFlush({
    onMessageSent: (item, saved) => {
      if (item.stageId !== stageId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === (saved as MessageSummary).id)
          ? prev.filter((m) => m.id !== item.id)
          : prev.map((m) => (m.id === item.id ? { ...(saved as MessageSummary) } : m))
      );
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setText("");

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOffline(content);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "TEXT" })
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
    } catch {
      await queueOffline(content);
    } finally {
      setSending(false);
    }
  }

  async function queueOffline(content: string) {
    const id = `pending-${crypto.randomUUID()}`;
    const item: OutboxMessageItem = { id, kind: "message", stageId, content, createdAt: Date.now() };
    await enqueueOutboxItem(item);
    setMessages((prev) => [
      ...prev,
      {
        id,
        stageId,
        content,
        type: "TEXT",
        createdAt: new Date().toISOString(),
        sender: { id: currentUserId, name: session?.user.name ?? "Вы" },
        pending: true
      }
    ]);
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
                  m.pending ? "bg-bg-elevated text-text-secondary" : mine ? "bg-brand text-white" : "bg-bg-card text-text-primary"
                }`}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold text-brand-light">{m.sender.name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={`mt-1 text-right text-xs ${
                    m.pending ? "text-text-muted" : mine ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  {m.pending ? "⏳ ждёт сети" : format(new Date(m.createdAt), "HH:mm")}
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
        <MicButton onResult={(spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
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
