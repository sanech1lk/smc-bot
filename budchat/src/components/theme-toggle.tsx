"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/theme";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system"
};

const LABEL: Record<ThemeMode, string> = {
  system: "Тема: как в системе",
  light: "Тема: светлая",
  dark: "Тема: тёмная"
};

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : SunMoon;

  return (
    <button
      onClick={() => setMode(NEXT_MODE[mode])}
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-card text-text-secondary transition-all hover:text-text-primary active:scale-95 active:bg-bg-elevated"
      aria-label={LABEL[mode]}
      title={LABEL[mode]}
    >
      <Icon size={20} strokeWidth={2} />
    </button>
  );
}
