import { useTranslation } from "react-i18next";

export function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="text-6xl">💬</div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("chat.emptyTitle")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("chat.emptyHint")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("chat.emptyExample")}
        </p>
      </div>
    </div>
  );
}