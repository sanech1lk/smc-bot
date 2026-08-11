"use client";

import { useRouter } from "next/navigation";
import { FileText, HelpCircle, Shield } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { SettingRow, SettingSection } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { ProfileCard } from "@/components/settings/profile-card";
import { LanguageSettings } from "@/components/settings/language-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PushPermissionRow } from "@/components/settings/push-permission-row";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AdsSettings } from "@/components/settings/ads-settings";
import { AccountDangerZone } from "@/components/settings/account-danger-zone";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="pb-28">
      <TopBar title={t("settings.pageTitle")} backHref="/projects" />

      <div className="space-y-5 px-4 py-4">
        <ProfileCard />
        <LanguageSettings />

        <SettingSection title={t("settings.pushSectionTitle")}>
          <PushPermissionRow />
        </SettingSection>

        <NotificationSettings />
        <AppearanceSettings />
        <AdsSettings />
        <AccountDangerZone />

        <SettingSection title={t("settings.about.sectionTitle")}>
          <SettingRow
            icon={FileText}
            title={t("settings.about.terms")}
            control={<span className="text-sm text-text-muted">→</span>}
            onClick={() => router.push("/legal/terms")}
          />
          <SettingRow
            icon={Shield}
            title={t("settings.about.privacy")}
            control={<span className="text-sm text-text-muted">→</span>}
            onClick={() => router.push("/legal/privacy")}
          />
          <SettingRow
            icon={HelpCircle}
            title={t("settings.about.support")}
            description="support@budchat.dev"
            control={null}
          />
        </SettingSection>

        <p className="pt-2 text-center text-xs text-text-muted">BudChat</p>
      </div>
    </div>
  );
}
