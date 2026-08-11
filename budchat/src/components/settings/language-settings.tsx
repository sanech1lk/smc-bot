"use client";

import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { Sheet, SettingRow, SettingSection } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export function LanguageSettings() {
  const { locale, autoDetected, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const currentLabel = SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeLabel ?? locale;

  return (
    <>
      <SettingSection title={t("settings.language.sectionTitle")}>
        <SettingRow
          icon={Languages}
          title={t("settings.language.rowTitle")}
          description={autoDetected ? `${currentLabel} · ${t("settings.language.autoDetectedNote")}` : currentLabel}
          control={<span className="text-sm text-text-muted">→</span>}
          onClick={() => setOpen(true)}
        />
      </SettingSection>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h3 className="text-lg font-bold">{t("settings.language.sheetTitle")}</h3>
          <p className="mt-1 text-sm text-text-secondary">{t("settings.language.sheetHint")}</p>

          <div className="mt-4 space-y-1.5">
            {SUPPORTED_LOCALES.map((option) => (
              <button
                key={option.code}
                onClick={() => {
                  setLocale(option.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  locale === option.code ? "border-brand bg-brand/5" : "border-border"
                }`}
              >
                <span className="font-medium">{option.nativeLabel}</span>
                {locale === option.code && <Check size={20} className="text-brand" />}
              </button>
            ))}
          </div>

          <button className="btn-ghost mt-4 w-full" onClick={() => setOpen(false)}>
            {t("common.done")}
          </button>
        </Sheet>
      )}
    </>
  );
}
