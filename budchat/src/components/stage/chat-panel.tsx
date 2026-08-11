"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { useSession } from "next-auth/react";
import { useStageSocket } from "@/lib/use-stage-socket";
import { useSettings } from "@/components/settings-provider";
import { useLocale } from "@/components/locale-provider";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";
import { MicButton } from "@/components/mic-button";
import { Clock3, MessageCircle, SendHorizontal } from "lucide-react";
import { Avatar, EmptyState, SkeletonChat } from "@/components/ui";
import { enqueueOutboxItem, getAllOutboxItems, type OutboxMessageItem } from "@/lib/outbox";
import { useOutboxFlush } from "@/lib/use-outbox-flush";
import type { MessageSummary } from "@/types/models";
import type { LocaleCode } from "@/lib/i18n";

type ChatMessage = MessageSummary & { pending?: boolean };

/** A message plus the layout hints derived from its neighbours. */
interface RenderedMessage {
  message: ChatMessage;
  /** First message of a run by the same sender — shows the name. */
  startsGroup: boolean;
  /** Last of a run — gets the tail corner and the timestamp. */
  endsGroup: boolean;
  /** Date separator to render above this message, if any. */
  daySeparator: string | null;
}

function dayLabel(date: Date, locale: LocaleCode, todayLabel: string, yesterdayLabel: string) {
  if (isToday(date)) return todayLabel;
  if (isYesterday(date)) return yesterdayLabel;
  return format(date, "d MMMM", { locale: dateFnsLocale(locale) });
}

/**
 * Groups consecutive messages from the same author (within 5 minutes) so the
 * name and timestamp aren't repeated on every line, and inserts day separators.
 */
function groupMessages(
  messages: ChatMessage[],
  locale: LocaleCode,
  todayLabel: string,
  yesterdayLabel: string
): RenderedMessage[] {
  const GROUP_WINDOW_MS = 5 * 60 * 1000;

  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const at = new Date(message.createdAt);

    const newDay = !prev || !isSameDay(new Date(prev.createdAt), at);
    const sameAsPrev =
      !!prev &&
      prev.sender.id === message.sender.id &&
      !newDay &&
      at.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
    const sameAsNext =
      !!next &&
      next.sender.id === message.sender.id &&
      isSameDay(new Date(next.createdAt), at) &&
      new Date(next.createdAt).getTime() - at.getTime() < GROUP_WINDOW_MS;

    return {
      message,
      startsGroup: !sameAsPrev,
      endsGroup: !sameAsNext,
      daySeparator: newDay ? dayLabel(at, locale, todayLabel, yesterdayLabel) : null
    };
  });
}

export function ChatPanel({ stageId, currentUserId }: { stageId: string; currentUserId: string }) {
  const { data: session } = useSession();
  const { locale, t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useStageSocket(stageId);
  const { notifyMessage, notifySend } = useSettings();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [res, outboxItems] = await Promise.all([
        fetch(`/api/stages/${stageId}/messages`).catch(() => null),
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
          sender: { id: currentUserId, name: session?.user.name ?? t("chat.youFallback") },
          pending: true
        }));

      if (res?.ok) {
        const data = await res.json();
        setMessages([...data.messages, ...pending]);
      } else {
        // Offline or server error: still show whatever is queued locally.
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

      // A message this device just sent arrives back over the socket too —
      // it must not trigger the incoming-message sound a second time.
      if (message.sender.id === currentUserId) return;

      // "Chat open" only means something while the tab is actually visible;
      // a backgrounded PWA should still alert like a closed chat would.
      const chatIsOpen = document.visibilityState === "visible";
      notifyMessage({ chatIsOpen });
    }
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, currentUserId, notifyMessage]);

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

  const rendered = useMemo(() => groupMessages(messages, locale, t("common.today"), t("common.yesterday")), [messages, locale, t]);

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
      notifySend();
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
        sender: { id: currentUserId, name: session?.user.name ?? t("chat.youFallback") },
        pending: true
      }
    ]);
  }

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] flex-col lg:h-[calc(100dvh-12rem)]">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && <SkeletonChat />}
        {!loading && messages.length === 0 && (
          <EmptyState icon={MessageCircle} title={t("chat.emptyTitle")} description={t("chat.emptyDescription")} />
        )}

        {rendered.map(({ message: m, startsGroup, endsGroup, daySeparator }) => {
          const mine = m.sender.id === currentUserId;
          return (
            <div key={m.id}>
              {daySeparator && (
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-text-muted">{daySeparator}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}

              <div
                className={`flex items-end gap-2 ${endsGroup ? "mb-2.5" : "mb-0.5"} ${
                  mine ? "flex-row-reverse" : ""
                }`}
              >
                {/* Avatar only on the last message of someone else's run, so a
                    group reads as one block instead of a column of faces. */}
                <div className="w-8 flex-shrink-0">
                  {!mine && endsGroup && (
                    <Avatar name={m.sender.name} id={m.sender.id} size={32} />
                  )}
                </div>

                <div
                  className={`bubble ${m.pending ? "border border-border bg-bg-elevated text-text-secondary" : mine ? "bubble-mine" : "bubble-theirs"} ${
                    endsGroup ? (mine ? "bubble-mine-tail" : "bubble-theirs-tail") : ""
                  }`}
                >
                  {!mine && startsGroup && (
                    <p className="mb-0.5 text-xs font-semibold text-brand-light">{m.sender.name}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {endsGroup && (
                    <p
                      className={`mt-1 text-right text-[11px] ${
                        m.pending ? "text-text-muted" : mine ? "text-white/75" : "text-text-muted"
                      }`}
                    >
                      {m.pending ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={11} />
                          {t("chat.waitingForSignal")}
                        </span>
                      ) : (
                        format(new Date(m.createdAt), "HH:mm")
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-border bg-bg-soft/60 px-3 py-3 backdrop-blur"
      >
        <input
          className="input flex-1 rounded-2xl"
          placeholder={t("chat.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <MicButton onResult={(spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
        <button
          type="submit"
          className="btn-primary aspect-square w-12 !rounded-2xl !px-0"
          disabled={sending || !text.trim()}
          aria-label={t("chat.sendAria")}
        >
          <SendHorizontal size={19} />
        </button>
      </form>
    </div>
  );
}
