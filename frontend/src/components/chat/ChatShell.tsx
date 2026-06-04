import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { ChatMessages } from "./ChatMessages";
import { ChatComposer } from "./ChatComposer";
import { CitationModal } from "./CitationModal";
import { CitationSidePanel } from "./CitationSidePanel";
import { EmptyState } from "./EmptyState";
import { useTheme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import type { SourceCitation } from "@/lib/types";

interface ChatShellProps {
  onToggleSidebar: () => void;
  hideSidebarToggleOnDesktop: boolean;
}

export function ChatShell({
  onToggleSidebar,
  hideSidebarToggleOnDesktop,
}: ChatShellProps) {
  const { t } = useTranslation();
  const { messages, isStreaming, send, stop } = useChat();
    const { theme, toggle: onToggleTheme } = useTheme();
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);
  const hasPanel = selectedCitation !== null;

  const handleClose = useCallback(() => setSelectedCitation(null), []);

  /** Called when user clicks a suggested prompt in EmptyState */
  const handleSendFromSuggestion = useCallback(
    (content: string) => {
      send(content);
    },
    [send],
  );

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

      {/* Main content + side panel (desktop) or modal (mobile) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat area — shrinks when side panel is open */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-200",
          )}
        >
          {messages.length === 0 && !isStreaming ? (
            <EmptyState onPromptClick={handleSendFromSuggestion} />
          ) : (
            <ChatMessages
              messages={messages}
              isStreaming={isStreaming}
              onCitationClick={setSelectedCitation}
            />
          )}

          {/* Composer */}
          <ChatComposer
            onSend={send}
            onStop={stop}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </div>

        {/* Desktop: side panel for citation details */}
        <div
          className={cn(
            "hidden lg:block shrink-0 overflow-hidden transition-all duration-200",
            hasPanel ? "w-80 border-l" : "w-0",
          )}
        >
          {hasPanel && (
            <CitationSidePanel
              citation={selectedCitation}
              onClose={handleClose}
            />
          )}
        </div>
      </div>

      {/* Mobile: use modal overlay for citation details */}
      <CitationModal
        citation={selectedCitation}
        onClose={handleClose}
      />
    </div>
  );
}