import { useCallback, useRef, useState } from "react";
import { submitQueryStream } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatMessage, SourceCitation } from "@/lib/types";

export function useChat(): {
  messages: ChatMessage[];
  isStreaming: boolean;
  send: (content: string) => Promise<void>;
  stop: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
} {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (!token || !content.trim()) return;

      // Abort any in-progress request
      stop();

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      // Create a placeholder assistant message that will accumulate tokens
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      abortRef.current = submitQueryStream(
        token,
        content,
        5,
        0.75,
        {
          onToken: (chunk: string) => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              // If the last message is the user message (assistant hasn't been added yet),
              // or it's a prior assistant message, create/append appropriately
              if (!last || last.id !== assistantId) {
                // First token — create the assistant message
                const assistantMsg: ChatMessage = {
                  id: assistantId,
                  role: "assistant",
                  content: chunk,
                  createdAt: Date.now(),
                };
                return [...prev, assistantMsg];
              }
              // Append token to existing assistant message
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
              return updated;
            });
          },

          onComplete: (citations: SourceCitation[], humanFallback: boolean) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].id === assistantId) {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  citations,
                  humanFallback,
                };
              } else if (updated.length > 0) {
                // Assistant message may not exist if stream was instant — create it
                const placeholder: ChatMessage = {
                  id: assistantId,
                  role: "assistant",
                  content: "",
                  citations,
                  humanFallback,
                  createdAt: Date.now(),
                };
                return [...updated, placeholder];
              }
              return updated;
            });
            abortRef.current = null;
            setIsStreaming(false);
          },

          onError: (_err: Error) => {
            const errMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
              createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, errMsg]);
            abortRef.current = null;
            setIsStreaming(false);
          },
        },
      );
    },
    [token, stop],
  );

  return { messages, isStreaming, send, stop, setMessages };
}
