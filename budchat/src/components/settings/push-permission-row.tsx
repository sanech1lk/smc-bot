"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { SettingRow, Switch } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/push-client";

const ERROR_KEY: Record<string, string> = {
  unsupported: "pushPermission.errorUnsupported",
  permissionDenied: "pushPermission.errorPermissionDenied",
  notConfigured: "pushPermission.errorNotConfigured"
};

/** Browser-level permission: separate from the per-category toggles above,
 *  since this is what actually lets a push reach the device at all. */
export function PushPermissionRow() {
  const { t } = useLocale();
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
        alert(t(ERROR_KEY[result.errorCode]));
        setStatus("unsubscribed");
      }
    }
    setBusy(false);
  }

  return (
    <SettingRow
      icon={BellRing}
      title={t("pushPermission.title")}
      description={status === "loading" ? t("pushPermission.checking") : t("pushPermission.description")}
      control={
        <Switch
          checked={status === "subscribed"}
          disabled={busy || status === "loading"}
          label={t("pushPermission.title")}
          onChange={handleToggle}
        />
      }
    />
  );
}
