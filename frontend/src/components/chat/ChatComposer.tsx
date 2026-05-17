import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Send, Lightbulb } from "lucide-react";
import { QueryTemplateModal, type QueryTemplate, QUERY_TEMPLATES } from "./QueryTemplateModal";

interface ChatComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

/**
 * Chat message composer adapted from the webui ThreadComposer + FastGPT patterns.
 *
 * Adds a "Templates" button that opens the QueryTemplateModal — adapted from
 * FastGPT's PromptTemplate component.
 */
export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (template: QueryTemplate) => {
    setInput(template.prompt);
    // Focus the textarea after inserting the template so the user can edit
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="border-t bg-background px-4 py-4">
      <div className="mx-auto flex max-w-3xl gap-3">
        {/* Templates button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTemplateOpen(true)}
          disabled={disabled}
          className="shrink-0 text-muted-foreground hover:text-primary"
          title={t("templates.title")}
        >
          <Lightbulb className="h-4 w-4" />
        </Button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />

        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="shrink-0"
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Query Template Modal */}
      <QueryTemplateModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

export { QUERY_TEMPLATES };
export type { QueryTemplate };