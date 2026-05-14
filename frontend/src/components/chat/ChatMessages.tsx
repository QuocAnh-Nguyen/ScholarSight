import { useEffect, useRef } from "react";
import type { ChatMessage, SourceCitation } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onCitationClick: (citation: SourceCitation) => void;
}

export function ChatMessages({ messages, isStreaming, onCitationClick }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCitationClick={onCitationClick}
          />
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-card border px-4 py-3">
              <span className="animate-pulse text-sm text-muted-foreground">
                Thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}