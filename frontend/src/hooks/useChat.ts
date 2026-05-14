import { useCallback, useState } from "react";
import { submitQuery } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatMessage } from "@/lib/types";

export function useChat(): {
  messages: ChatMessage[];
  isStreaming: boolean;
  send: (content: string) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
} {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(
    async (content: string) => {
      if (!token || !content.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      try {
        const resp = await submitQuery(token, content);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: resp.answer,
          citations: resp.citations,
          humanFallback: resp.human_fallback,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsStreaming(false);
      }
    },
    [token],
  );

  return { messages, isStreaming, send, setMessages };
}