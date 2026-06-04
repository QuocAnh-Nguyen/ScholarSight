import { ChatShell } from "@/components/chat/ChatShell";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function ChatPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("app.documentTitle.base");
  }, [t]);

  const toggleSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("scholarsight:toggle-sidebar"));
  }, []);

  return (
    <ChatShell
      onToggleSidebar={toggleSidebar}
      hideSidebarToggleOnDesktop={false}
    />
  );
}
