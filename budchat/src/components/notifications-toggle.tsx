"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/push-client";

export function NotificationsToggle() {
  const [status, setStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getPushSubscriptionStatus().then(setStatus);
  }, []);

  if (status === "unsupported" || status === "loading") return null;

  async function handleClick() {
    setBusy(true);
    if (status === "subscribed") {
      await unsubscribeFromPush();
      setStatus("unsubscribed");
    } else {
      const result = await subscribeToPush();
      if (result.ok) {
        setStatus("subscribed");
      } else if (result.error) {
        alert(result.error);
      }
    }
    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-bg-card transition-colors active:bg-bg-elevated disabled:opacity-50 ${
        status === "subscribed" ? "text-brand" : "text-text-secondary"
      }`}
      aria-label={status === "subscribed" ? "Уведомления включены" : "Включить уведомления"}
      title={status === "subscribed" ? "Уведомления включены — нажмите, чтобы отключить" : "Включить push-уведомления"}
    >
      {status === "subscribed" ? <Bell size={20} /> : <BellOff size={20} />}
    </button>
  );
}
