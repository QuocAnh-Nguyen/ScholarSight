import { useTranslation } from "react-i18next";
import type { ChatMessage, SourceCitation } from "@/lib/types";
import { MarkdownText } from "./MarkdownText";
import { CitationChip } from "./CitationChip";

interface MessageBubbleProps {
  message: ChatMessage;
  /** Whether this message is being actively streamed (applies to the last AI message). */
  isStreaming?: boolean;
  onCitationClick: (citation: SourceCitation) => void;
}

export function MessageBubble({ message, isStreaming = false, onCitationClick }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const hasCitations = message.citations && message.citations.length > 0;
  const isFallback = message.humanFallback;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : isFallback
              ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
              : "bg-card border"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <>
            <MarkdownText
              content={message.content}
              isStreaming={isStreaming}
              citations={message.citations}
              onCitationClick={onCitationClick}
            />
            {isFallback && (
              <div className="mt-2 text-xs text-muted-foreground">
                {t("chat.humanFallback")}
              </div>
            )}
            {hasCitations && (
              <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                {message.citations?.map((cit, i) => (
                  <CitationChip
                    key={`${cit.doc_id}-${i}`}
                    citation={cit}
                    onClick={() => onCitationClick(cit)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
