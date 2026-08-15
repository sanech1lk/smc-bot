"use client";

import { Check, Play } from "lucide-react";
import { Sheet } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { SOUND_OPTIONS } from "@/lib/settings";
import { playSound } from "@/lib/sounds";

const SOUND_KEY: Record<string, { label: string; description: string }> = {
  ping: { label: "sound.pingLabel", description: "sound.pingDescription" },
  knock: { label: "sound.knockLabel", description: "sound.knockDescription" },
  chirp: { label: "sound.chirpLabel", description: "sound.chirpDescription" },
  bell: { label: "sound.bellLabel", description: "sound.bellDescription" },
  none: { label: "sound.noneLabel", description: "sound.noneDescription" }
};

export function SoundPickerSheet({
  value,
  volume,
  onSelect,
  onClose
}: {
  value: string;
  volume: number;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <Sheet onClose={onClose}>
      <h3 className="text-lg font-bold">{t("soundPicker.title")}</h3>
      <p className="mt-1 text-sm text-text-secondary">{t("soundPicker.hint")}</p>

      <div className="mt-4 space-y-2">
        {SOUND_OPTIONS.map((option) => {
          const label = t(SOUND_KEY[option.id].label);
          return (
            <div
              key={option.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                value === option.id ? "border-brand bg-brand/5" : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => playSound(option.id, volume)}
                disabled={option.id === "none"}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-text-secondary active:scale-95 disabled:opacity-30"
                aria-label={t("soundPicker.previewAria", { label })}
              >
                <Play size={16} fill="currentColor" />
              </button>

              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(option.id)}>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-text-muted">{t(SOUND_KEY[option.id].description)}</p>
              </button>

              {value === option.id && <Check size={20} className="flex-shrink-0 text-brand" />}
            </div>
          );
        })}
      </div>

      <button className="btn-ghost mt-4 w-full" onClick={onClose}>
        {t("common.done")}
      </button>
    </Sheet>
  );
}
