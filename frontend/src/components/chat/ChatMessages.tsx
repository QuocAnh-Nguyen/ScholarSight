import { useEffect, useRef } from "react";
import type { ChatMessage, SourceCitation } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onCitationClick: (citation: SourceCitation) => void;
}

/**
 * Renders the chat message list and auto-scrolls to the bottom.
 *
 * FIX 3B: Uses "instant" scrolling during active streaming to avoid the
 * jank caused by smooth-scroll being cancelled/restarted 20-50 times/sec.
 * Falls back to "smooth" for a pleasant one-time animation when the stream
 * ends or when viewing historical messages.
 */
export function ChatMessages({ messages, isStreaming, onCitationClick }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "instant" : "smooth",
    });
  }, [messages, isStreaming]);

  const lastIndex = messages.length - 1;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && i === lastIndex && msg.role === "assistant"}
            onCitationClick={onCitationClick}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
