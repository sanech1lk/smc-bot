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
import { formatMinuteOfDay, SOUND_OPTIONS } from "@/lib/settings";
import { isVibrationSupported, playSound, unlockAudio, vibrate } from "@/lib/sounds";
import { SoundPickerSheet } from "@/components/settings/sound-picker-sheet";

function minutesToTimeInput(minutes: number): string {
  return formatMinuteOfDay(minutes);
}

function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function NotificationSettings() {
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
      <SettingSection title="Звук и вибрация">
        <SettingRow
          icon={Volume2}
          title="Звук сообщения"
          description={currentSound?.label ?? "Пинг"}
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
                Громкость
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
              aria-label="Громкость звука сообщений"
            />
          </div>
        )}

        <SettingRow
          icon={Bell}
          title="Включён"
          description="Звук на входящие сообщения"
          control={
            <Switch
              checked={settings.soundEnabled}
              label="Звук на входящие сообщения"
              onChange={(next) => update({ soundEnabled: next })}
            />
          }
        />

        {vibrationSupported && (
          <SettingRow
            icon={Smartphone}
            title="Вибрация"
            control={
              <Switch
                checked={settings.vibrationEnabled}
                label="Вибрация на входящие сообщения"
                onChange={(next) => {
                  if (next) vibrate(40);
                  update({ vibrationEnabled: next });
                }}
              />
            }
          />
        )}

        <SettingRow
          title="Звук в открытом чате"
          description="Оповещать, даже если чат уже открыт на экране"
          control={
            <Switch
              checked={settings.soundInOpenChat}
              label="Звук в открытом чате"
              onChange={(next) => update({ soundInOpenChat: next })}
            />
          }
        />

        <SettingRow
          title="Звук отправки"
          description="Короткий щелчок, когда ваше сообщение ушло"
          control={
            <Switch
              checked={settings.soundOnSend}
              label="Звук при отправке своего сообщения"
              onChange={(next) => update({ soundOnSend: next })}
            />
          }
        />
      </SettingSection>

      <SettingSection title="Тихие часы">
        <SettingRow
          icon={Moon}
          title="Не беспокоить"
          description={
            settings.quietEnabled
              ? `${minutesToTimeInput(settings.quietFrom)} – ${minutesToTimeInput(settings.quietTo)}`
              : "Выключено"
          }
          control={
            <Switch
              checked={settings.quietEnabled}
              label="Тихие часы"
              onChange={(next) => update({ quietEnabled: next })}
            />
          }
        />
        {settings.quietEnabled && (
          <div className="flex items-center gap-3 py-3">
            <label className="flex-1 text-sm text-text-secondary">
              С
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
              До
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
          <p className="text-sm text-text-muted">
            В это время сообщения приходят без звука и вибрации — сам чат работает как обычно.
          </p>
        </div>
      </SettingSection>

      <SettingSection title="Что присылать">
        <SettingRow
          icon={MessageSquare}
          title="Сообщения в чате"
          control={
            <Switch
              checked={settings.notifyMessages}
              label="Уведомлять о сообщениях"
              onChange={(next) => update({ notifyMessages: next })}
            />
          }
        />
        <SettingRow
          icon={ClipboardList}
          title="Задачи"
          description="Назначение и смена статуса"
          control={
            <Switch
              checked={settings.notifyTasks}
              label="Уведомлять о задачах"
              onChange={(next) => update({ notifyTasks: next })}
            />
          }
        />
        <SettingRow
          icon={CircleDollarSign}
          title="Допработы"
          description="Новые и согласованные"
          control={
            <Switch
              checked={settings.notifyChangeOrders}
              label="Уведомлять о допработах"
              onChange={(next) => update({ notifyChangeOrders: next })}
            />
          }
        />
        <SettingRow
          icon={ShieldAlert}
          title="Дефекты"
          control={
            <Switch
              checked={settings.notifyPunch}
              label="Уведомлять о дефектах"
              onChange={(next) => update({ notifyPunch: next })}
            />
          }
        />
        <SettingRow
          icon={ImageIcon}
          title="Новые фото"
          control={
            <Switch
              checked={settings.notifyPhotos}
              label="Уведомлять о новых фото"
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
