"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme";
import { LocaleProvider } from "@/components/locale-provider";
import { SettingsProvider } from "@/components/settings-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <ThemeProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
