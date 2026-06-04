import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {t("settings.sidebar.title")} — Coming in next phase
    </div>
  );
}
