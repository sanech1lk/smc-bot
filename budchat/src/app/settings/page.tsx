"use client";

import { useRouter } from "next/navigation";
import { FileText, HelpCircle, Shield } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { SettingRow, SettingSection } from "@/components/ui";
import { ProfileCard } from "@/components/settings/profile-card";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PushPermissionRow } from "@/components/settings/push-permission-row";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AdsSettings } from "@/components/settings/ads-settings";
import { AccountDangerZone } from "@/components/settings/account-danger-zone";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="pb-28">
      <TopBar title="Настройки" backHref="/projects" />

      <div className="space-y-5 px-4 py-4">
        <ProfileCard />

        <SettingSection title="Уведомления на устройство">
          <PushPermissionRow />
        </SettingSection>

        <NotificationSettings />
        <AppearanceSettings />
        <AdsSettings />
        <AccountDangerZone />

        <SettingSection title="О приложении">
          <SettingRow
            icon={FileText}
            title="Условия использования"
            control={<span className="text-sm text-text-muted">→</span>}
            onClick={() => router.push("/legal/terms")}
          />
          <SettingRow
            icon={Shield}
            title="Политика конфиденциальности"
            control={<span className="text-sm text-text-muted">→</span>}
            onClick={() => router.push("/legal/privacy")}
          />
          <SettingRow icon={HelpCircle} title="Поддержка" description="support@budchat.dev" control={null} />
        </SettingSection>

        <p className="pt-2 text-center text-xs text-text-muted">BudChat</p>
      </div>
    </div>
  );
}
