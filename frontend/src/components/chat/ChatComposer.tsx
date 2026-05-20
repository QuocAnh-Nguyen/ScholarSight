import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Send, Lightbulb, Square } from "lucide-react";
import { QueryTemplateModal, type QueryTemplate, QUERY_TEMPLATES } from "./QueryTemplateModal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Enhanced ChatComposer adapted from FastGPT's HelperBot/Chatinput.tsx.
//
// Key additions:
//   - Auto-resize textarea (grows with content up to 6 rows, then scrolls)
//   - Elevated card container with focus shadow (matching FastGPT's polished feel)
//   - Stop button during generation (appears in place of Send)
//   - Ctrl+Enter / Alt+Enter for newline (FastGPT pattern)
//   - Templates button with lightbulb icon (adapted from FastGPT prompt templates)
//
// FastGPT source: FastGPT-reference/components/core/chat/HelperBot/Chatinput.tsx
// ---------------------------------------------------------------------------

const TEXTAREA_MIN_HEIGHT = 40;  // 1 row
const TEXTAREA_MAX_HEIGHT = 168; // ~6 rows at ~28px/row

interface ChatComposerProps {
  onSend: (content: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

/**
 * Chat message composer with auto-resize textarea and FastGPT-inspired styling.
 *
 * Features:
 * - Auto-resize textarea: grows from 1 to ~6 rows, then shows scrollbar
 * - Elevated card shadow that intensifies on focus/hover
 * - Stop button replaces Send when ``isStreaming``
 * - Ctrl+Enter or Alt+Enter inserts a newline
 * - Templates button opens QueryTemplateModal
 */
export function ChatComposer({
  onSend,
  onStop,
  disabled,
  isStreaming = false,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // -- Auto-focus on enable -------------------------------------------------
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // -- Auto-resize textarea -------------------------------------------------
  const adjustHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    // Reset to min height so scrollHeight reflects actual content height
    el.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    const newHeight = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT);
    el.style.height = `${newHeight}px`;

    // Only show scrollbar when content exceeds max height
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      // adjustHeight is called via the next tick by the browser layout
      requestAnimationFrame(adjustHeight);
    },
    [adjustHeight],
  );

  // -- Send / Stop ----------------------------------------------------------
  const handleSend = useCallback(() => {
    if (isStreaming) {
      onStop?.();
      return;
    }
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
    // Reset height after clearing
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
        inputRef.current.style.overflowY = "hidden";
      }
    });
  }, [input, disabled, isStreaming, onSend, onStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isEnter = e.key === "Enter";

      // Ctrl+Enter or Alt+Enter → insert newline (FastGPT pattern)
      if (isEnter && (e.ctrlKey || e.altKey)) {
        const el = e.currentTarget as HTMLTextAreaElement;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const val = el.value;
        el.value = `${val.slice(0, start)}\n${val.slice(end)}`;
        el.selectionStart = start + 1;
        el.selectionEnd = start + 1;
        setInput(el.value);
        requestAnimationFrame(adjustHeight);
        return;
      }

      // Enter (without Shift) → send
      if (isEnter && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
    },
    [handleSend, adjustHeight],
  );

  // -- Template selection ---------------------------------------------------
  const handleTemplateSelect = useCallback(
    (template: QueryTemplate) => {
      setInput(template.prompt);
      // Focus the textarea after inserting the template
      setTimeout(() => {
        inputRef.current?.focus();
        requestAnimationFrame(adjustHeight);
      }, 50);
    },
    [adjustHeight],
  );

  const canSend = !!input.trim() && !disabled;
  const showStop = isStreaming;

  return (
    <div className="border-t bg-background px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {/* Elevated card wrapper — FastGPT ChatInput pattern */}
        <div
          className={cn(
            "flex flex-col gap-0 rounded-2xl border-0.5 px-1 pb-1 transition-all",
            "border-border bg-background",
            "shadow-[0px_5px_16px_-4px_rgba(19,51,107,0.08)]",
            focusing
              ? "shadow-[0px_5px_20px_-4px_rgba(19,51,107,0.13)] border-primary/30"
              : "hover:shadow-[0px_5px_20px_-4px_rgba(19,51,107,0.1)]",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Textarea area */}
          <div className="flex items-start gap-1 pt-3">
            {/* Templates button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setTemplateOpen(true);
              }}
              disabled={disabled}
              className="ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
              title={t("templates.title")}
            >
              <Lightbulb className="h-4 w-4" />
            </Button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusing(true)}
              onBlur={() => setFocusing(false)}
              placeholder={t("chat.placeholder")}
              disabled={disabled}
              rows={1}
              className={cn(
                "flex-1 resize-none border-none bg-transparent px-2 py-0",
                "text-[0.9375rem] leading-relaxed text-foreground",
                "placeholder:text-muted-foreground/60",
                "focus-visible:outline-none focus-visible:ring-0",
                "disabled:opacity-50",
              )}
              style={{
                height: `${TEXTAREA_MIN_HEIGHT}px`,
                minHeight: `${TEXTAREA_MIN_HEIGHT}px`,
                letterSpacing: "0.3px",
              }}
            />
          </div>

          {/* Bottom bar: send/stop button */}
          <div className="flex items-center justify-end px-2 pb-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              disabled={!canSend && !showStop}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                showStop
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : canSend
                    ? ""
                    : "bg-muted text-muted-foreground opacity-50",
              )}
              title={showStop ? t("chat.stopGenerating") : t("chat.send")}
            >
              {showStop ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Query Template Modal */}
      <QueryTemplateModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onSelect={handleTemplateSelect}
      />

      {/* Disclaimer */}
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground/60">
        {t("chat.disclaimer")}
      </p>
    </div>
  );
}

export { QUERY_TEMPLATES };
export type { QueryTemplate };