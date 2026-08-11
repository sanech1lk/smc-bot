"use client";

import { Moon, Sun, SunMoon, Type } from "lucide-react";
import { SettingSection } from "@/components/ui";
import { useTheme, type ThemeMode } from "@/components/theme";
import { useSettings } from "@/components/settings-provider";
import { TEXT_SCALES } from "@/lib/settings";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Светлая", icon: Sun },
  { mode: "dark", label: "Тёмная", icon: Moon },
  { mode: "system", label: "Системная", icon: SunMoon }
];

const SCALE_LABEL: Record<number, string> = { 100: "Обычный", 115: "Крупнее", 130: "Самый крупный" };

export function AppearanceSettings() {
  const { mode, setMode } = useTheme();
  const { settings, update } = useSettings();

  return (
    <SettingSection title="Внешний вид">
      <div className="py-3">
        <p className="mb-2 text-sm text-text-secondary">Тема</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ mode: m, label, icon: Icon }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors ${
                mode === m ? "border-brand bg-brand/5 text-brand" : "border-border text-text-secondary"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="py-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm text-text-secondary">
          <Type size={15} />
          Размер текста
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SCALES.map((scale) => (
            <button
              key={scale}
              onClick={() => update({ textScale: scale })}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                settings.textScale === scale
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-border text-text-secondary"
              }`}
            >
              <span style={{ fontSize: `${0.8 + (scale - 100) / 300}rem` }} className="block font-semibold">
                Аа
              </span>
              <span className="mt-1 block text-xs">{SCALE_LABEL[scale]}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-muted">Удобно на солнце или в перчатках.</p>
      </div>
    </SettingSection>
  );
}
