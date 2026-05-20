import { useCallback, useRef, useState } from "react";
import { submitQuery } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { ChatMessage } from "@/lib/types";

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
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort("user_stop");
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

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resp = await submitQuery(token, content, 5, 0.75, controller.signal);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: resp.answer,
          citations: resp.citations,
          humanFallback: resp.human_fallback,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        // Don't show error if the user intentionally stopped
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof Error && err.message === "user_stop") return;

        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [token, stop],
  );

  return { messages, isStreaming, send, stop, setMessages };
}