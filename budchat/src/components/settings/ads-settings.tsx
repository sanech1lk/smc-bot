"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Sheet, SettingRow, SettingSection, Switch } from "@/components/ui";
import { useSettings } from "@/components/settings-provider";

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
      <SettingSection title="Реклама">
        <div className="py-3">
          <p className="text-sm text-text-secondary">
            Сейчас BudChat не показывает рекламу. Здесь заранее настраивается согласие на её вид —
            на случай, если она появится в будущей версии.
          </p>
        </div>
        <SettingRow
          icon={Megaphone}
          title="Персонализированная реклама"
          description={
            settings.adsPersonalized
              ? "Разрешена — подбор с учётом ваших действий в приложении"
              : "Выключена — при появлении рекламы она будет обычной, без подбора"
          }
          control={
            <Switch
              checked={settings.adsPersonalized}
              label="Персонализированная реклама"
              onChange={(next) => (next ? setConfirming(true) : turnOff())}
            />
          }
        />
      </SettingSection>

      {confirming && (
        <Sheet onClose={() => setConfirming(false)}>
          <h3 className="text-lg font-bold">Персонализированная реклама</h3>
          <p className="mt-2 text-text-secondary">
            Если в приложении появится реклама, мы сможем подбирать её на основе того, какими
            разделами BudChat вы пользуетесь. Содержимое чатов, фото объектов и сметы для этого
            никогда не используется.
          </p>
          <p className="mt-2 text-text-secondary">
            Без согласия реклама (если появится) будет показываться без подбора под вас. Это ничего
            не меняет для вашей команды и объектов.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Согласие можно отозвать в любой момент здесь же.{" "}
            <Link href="/legal/privacy" className="text-brand underline">
              Политика конфиденциальности
            </Link>
            .
          </p>

          {/* Equal size and weight on both actions — an opt-in dialog must not
              nudge the user toward "allow" by making it visually louder. */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Не сейчас
            </button>
            <button className="btn-secondary" onClick={turnOn} disabled={busy}>
              {busy ? "Сохраняем…" : "Разрешить"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
