"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Sheet, SettingRow, SettingSection, Switch } from "@/components/ui";
import { useSettings } from "@/components/settings-provider";
import { useLocale } from "@/components/locale-provider";

/**
 * BudChat shows no advertising today — there is no ad network wired in. This
 * screen exists so the choice is already stored and provable the day one is
 * added, instead of retrofitting consent onto an existing user base.
 *
 * GDPR requires an unambiguous opt-in for personalised ads: no pre-ticked
 * box, and "allow" and "decline" presented with equal visual weight. The
 * toggle below defaults to off and can only flip on through the dialog,
 * which gives both buttons the same size and color prominence.
 */
export function AdsSettings() {
  const { t } = useLocale();
  const { settings, update } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    await update({ adsPersonalized: true });
    setBusy(false);
    setConfirming(false);
  }

  async function turnOff() {
    await update({ adsPersonalized: false });
    setConfirming(false);
  }

  return (
    <>
      <SettingSection title={t("adsSettings.title")}>
        <div className="py-3">
          <p className="text-sm text-text-secondary">{t("adsSettings.intro")}</p>
        </div>
        <SettingRow
          icon={Megaphone}
          title={t("adsSettings.personalizedTitle")}
          description={settings.adsPersonalized ? t("adsSettings.personalizedOn") : t("adsSettings.personalizedOff")}
          control={
            <Switch
              checked={settings.adsPersonalized}
              label={t("adsSettings.personalizedTitle")}
              onChange={(next) => (next ? setConfirming(true) : turnOff())}
            />
          }
        />
      </SettingSection>

      {confirming && (
        <Sheet onClose={() => setConfirming(false)}>
          <h3 className="text-lg font-bold">{t("adsSettings.dialogTitle")}</h3>
          <p className="mt-2 text-text-secondary">{t("adsSettings.dialogBody1")}</p>
          <p className="mt-2 text-text-secondary">{t("adsSettings.dialogBody2")}</p>
          <p className="mt-2 text-sm text-text-muted">
            {t("adsSettings.dialogHint")}{" "}
            <Link href="/legal/privacy" className="text-brand underline">
              {t("adsSettings.privacyLink")}
            </Link>
            .
          </p>

          {/* Equal size and weight on both actions — an opt-in dialog must not
              nudge the user toward "allow" by making it visually louder. */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
              {t("adsSettings.notNow")}
            </button>
            <button className="btn-secondary" onClick={turnOn} disabled={busy}>
              {busy ? t("adsSettings.saving") : t("adsSettings.allow")}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
