import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { ChatMessages } from "./ChatMessages";
import { ChatComposer } from "./ChatComposer";
import { CitationModal } from "./CitationModal";
import { EmptyState } from "./EmptyState";
import type { SourceCitation } from "@/lib/types";

interface ChatShellProps {
  onToggleSidebar: () => void;
  hideSidebarToggleOnDesktop: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function ChatShell({
  onToggleSidebar,
  hideSidebarToggleOnDesktop,
  theme,
  onToggleTheme,
}: ChatShellProps) {
  const { t } = useTranslation();
  const { messages, isStreaming, send } = useChat();
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          className={hideSidebarToggleOnDesktop ? "lg:hidden" : ""}
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold">{t("chat.emptyTitle")}</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Chat area */}
      {messages.length === 0 && !isStreaming ? (
        <EmptyState />
      ) : (
        <ChatMessages
          messages={messages}
          isStreaming={isStreaming}
          onCitationClick={setSelectedCitation}
        />
      )}

      {/* Composer */}
      <ChatComposer onSend={send} disabled={isStreaming} />

      {/* Citation modal */}
      <CitationModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}