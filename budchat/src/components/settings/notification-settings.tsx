"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CircleDollarSign,
  ClipboardList,
  Image as ImageIcon,
  MessageSquare,
  Moon,
  ShieldAlert,
  Smartphone,
  Volume2
} from "lucide-react";
import { SettingRow, SettingSection, Switch } from "@/components/ui";
import { useSettings } from "@/components/settings-provider";
import { useLocale } from "@/components/locale-provider";
import { formatMinuteOfDay, SOUND_OPTIONS } from "@/lib/settings";
import { isVibrationSupported, playSound, unlockAudio, vibrate } from "@/lib/sounds";
import { SoundPickerSheet } from "@/components/settings/sound-picker-sheet";

const SOUND_LABEL_KEY: Record<string, string> = {
  ping: "sound.pingLabel",
  knock: "sound.knockLabel",
  chirp: "sound.chirpLabel",
  bell: "sound.bellLabel",
  none: "sound.noneLabel"
};

function minutesToTimeInput(minutes: number): string {
  return formatMinuteOfDay(minutes);
}

function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function NotificationSettings() {
  const { t } = useLocale();
  const { settings, update } = useSettings();
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);
  const currentSound = SOUND_OPTIONS.find((s) => s.id === settings.soundName);

  // The Vibration API only exists in the browser, so this can't be read
  // during the render that produces the server HTML — doing so would make
  // the server and client render different rows and break hydration. It has
  // to settle after mount, same as any other browser-only capability check.
  const [vibrationSupported, setVibrationSupported] = useState(false);
  useEffect(() => setVibrationSupported(isVibrationSupported()), []);

  return (
    <>
      <SettingSection title={t("notificationSettings.soundSectionTitle")}>
        <SettingRow
          icon={Volume2}
          title={t("notificationSettings.messageSoundTitle")}
          description={currentSound ? t(SOUND_LABEL_KEY[currentSound.id]) : t("sound.pingLabel")}
          control={<span className="text-sm text-text-muted">→</span>}
          onClick={() => {
            unlockAudio();
            setSoundSheetOpen(true);
          }}
        />

        {settings.soundName !== "none" && (
          <div className="py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="sound-volume" className="text-sm text-text-secondary">
                {t("notificationSettings.volumeLabel")}
              </label>
              <span className="text-sm tabular text-text-muted">{settings.soundVolume}%</span>
            </div>
            <input
              id="sound-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.soundVolume}
              onChange={(e) => update({ soundVolume: Number(e.target.value) })}
              onPointerUp={() => {
                unlockAudio();
                playSound(settings.soundName, settings.soundVolume);
              }}
              className="w-full accent-[rgb(var(--brand))]"
              aria-label={t("notificationSettings.volumeAria")}
            />
          </div>
        )}

        <SettingRow
          icon={Bell}
          title={t("notificationSettings.enabledTitle")}
          description={t("notificationSettings.enabledDescription")}
          control={
            <Switch
              checked={settings.soundEnabled}
              label={t("notificationSettings.enabledDescription")}
              onChange={(next) => update({ soundEnabled: next })}
            />
          }
        />

        {vibrationSupported && (
          <SettingRow
            icon={Smartphone}
            title={t("notificationSettings.vibrationTitle")}
            control={
              <Switch
                checked={settings.vibrationEnabled}
                label={t("notificationSettings.vibrationSwitchLabel")}
                onChange={(next) => {
                  if (next) vibrate(40);
                  update({ vibrationEnabled: next });
                }}
              />
            }
          />
        )}

        <SettingRow
          title={t("notificationSettings.openChatTitle")}
          description={t("notificationSettings.openChatDescription")}
          control={
            <Switch
              checked={settings.soundInOpenChat}
              label={t("notificationSettings.openChatTitle")}
              onChange={(next) => update({ soundInOpenChat: next })}
            />
          }
        />

        <SettingRow
          title={t("notificationSettings.sendSoundTitle")}
          description={t("notificationSettings.sendSoundDescription")}
          control={
            <Switch
              checked={settings.soundOnSend}
              label={t("notificationSettings.sendSoundSwitchLabel")}
              onChange={(next) => update({ soundOnSend: next })}
            />
          }
        />
      </SettingSection>

      <SettingSection title={t("notificationSettings.quietHoursSectionTitle")}>
        <SettingRow
          icon={Moon}
          title={t("notificationSettings.quietHoursTitle")}
          description={
            settings.quietEnabled
              ? `${minutesToTimeInput(settings.quietFrom)} – ${minutesToTimeInput(settings.quietTo)}`
              : t("notificationSettings.quietHoursOff")
          }
          control={
            <Switch
              checked={settings.quietEnabled}
              label={t("notificationSettings.quietHoursSwitchLabel")}
              onChange={(next) => update({ quietEnabled: next })}
            />
          }
        />
        {settings.quietEnabled && (
          <div className="flex items-center gap-3 py-3">
            <label className="flex-1 text-sm text-text-secondary">
              {t("notificationSettings.fromLabel")}
              <input
                type="time"
                className="input mt-1"
                value={minutesToTimeInput(settings.quietFrom)}
                onChange={(e) => {
                  const m = timeInputToMinutes(e.target.value);
                  if (m !== null) update({ quietFrom: m });
                }}
              />
            </label>
            <label className="flex-1 text-sm text-text-secondary">
              {t("notificationSettings.toLabel")}
              <input
                type="time"
                className="input mt-1"
                value={minutesToTimeInput(settings.quietTo)}
                onChange={(e) => {
                  const m = timeInputToMinutes(e.target.value);
                  if (m !== null) update({ quietTo: m });
                }}
              />
            </label>
          </div>
        )}
        <div className="py-3">
          <p className="text-sm text-text-muted">{t("notificationSettings.quietHoursHint")}</p>
        </div>
      </SettingSection>

      <SettingSection title={t("notificationSettings.whatToSendSectionTitle")}>
        <SettingRow
          icon={MessageSquare}
          title={t("notificationSettings.messagesTitle")}
          control={
            <Switch
              checked={settings.notifyMessages}
              label={t("notificationSettings.messagesSwitchLabel")}
              onChange={(next) => update({ notifyMessages: next })}
            />
          }
        />
        <SettingRow
          icon={ClipboardList}
          title={t("notificationSettings.tasksTitle")}
          description={t("notificationSettings.tasksDescription")}
          control={
            <Switch
              checked={settings.notifyTasks}
              label={t("notificationSettings.tasksSwitchLabel")}
              onChange={(next) => update({ notifyTasks: next })}
            />
          }
        />
        <SettingRow
          icon={CircleDollarSign}
          title={t("notificationSettings.changeOrdersTitle")}
          description={t("notificationSettings.changeOrdersDescription")}
          control={
            <Switch
              checked={settings.notifyChangeOrders}
              label={t("notificationSettings.changeOrdersSwitchLabel")}
              onChange={(next) => update({ notifyChangeOrders: next })}
            />
          }
        />
        <SettingRow
          icon={ShieldAlert}
          title={t("notificationSettings.punchTitle")}
          control={
            <Switch
              checked={settings.notifyPunch}
              label={t("notificationSettings.punchSwitchLabel")}
              onChange={(next) => update({ notifyPunch: next })}
            />
          }
        />
        <SettingRow
          icon={ImageIcon}
          title={t("notificationSettings.photosTitle")}
          control={
            <Switch
              checked={settings.notifyPhotos}
              label={t("notificationSettings.photosSwitchLabel")}
              onChange={(next) => update({ notifyPhotos: next })}
            />
          }
        />
      </SettingSection>

      {soundSheetOpen && (
        <SoundPickerSheet
          value={settings.soundName}
          volume={settings.soundVolume}
          onSelect={(name) => {
            update({ soundName: name });
            playSound(name, settings.soundVolume);
          }}
          onClose={() => setSoundSheetOpen(false)}
        />
      )}
    </>
  );
}
