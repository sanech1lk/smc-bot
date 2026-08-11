"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { SettingRow, Switch } from "@/components/ui";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/push-client";

/** Browser-level permission: separate from the per-category toggles above,
 *  since this is what actually lets a push reach the device at all. */
export function PushPermissionRow() {
  const [status, setStatus] = useState<"loading" | "subscribed" | "unsubscribed" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getPushSubscriptionStatus().then(setStatus);
  }, []);

  if (status === "unsupported") return null;

  async function handleToggle(next: boolean) {
    setBusy(true);
    if (!next) {
      await unsubscribeFromPush();
      setStatus("unsubscribed");
    } else {
      const result = await subscribeToPush();
      if (result.ok) {
        setStatus("subscribed");
      } else {
        if (result.error) alert(result.error);
        setStatus("unsubscribed");
      }
    }
    setBusy(false);
  }

  return (
    <SettingRow
      icon={BellRing}
      title="Push-уведомления на устройство"
      description={status === "loading" ? "Проверяем…" : "Приходят, даже если приложение закрыто"}
      control={
        <Switch
          checked={status === "subscribed"}
          disabled={busy || status === "loading"}
          label="Push-уведомления на устройство"
          onChange={handleToggle}
        />
      }
    />
  );
}
