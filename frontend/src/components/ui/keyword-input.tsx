import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordInputProps {
  /** Current list of keywords */
  values: string[];
  /** Called when the keyword list changes (add or remove) */
  onChange: (values: string[]) => void;
  /** Placeholder text for the inline input */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum number of keywords allowed */
  maxKeywords?: number;
  /** Additional classes for the outer wrapper */
  className?: string;
  /** Message shown when a duplicate keyword is entered */
  duplicateMessage?: string;
}

/**
 * Tag-style keyword input adapted from FastGPT's TagTextarea.
 *
 * Renders a container with keyword chips and an inline text input. Press
 * Enter or blur to add a keyword; click the X on a chip to remove it.
 *
 * FastGPT source: FastGPT-reference/components/common/Textarea/TagTextarea.tsx
 */
export function KeywordInput({
  values,
  onChange,
  placeholder = "Type keyword and press Enter...",
  disabled = false,
  maxKeywords,
  className,
  duplicateMessage = "Keyword already added",
}: KeywordInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commitValue = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      if (values.includes(trimmed)) {
        setError(duplicateMessage);
        setTimeout(() => setError(null), 2000);
        return;
      }

      if (maxKeywords !== undefined && values.length >= maxKeywords) {
        setError(`Maximum ${maxKeywords} keywords allowed`);
        setTimeout(() => setError(null), 2000);
        return;
      }

      onChange([...values, trimmed]);
      setInputValue("");
      setError(null);
    },
    [values, onChange, maxKeywords, duplicateMessage],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && values.length > 0) {
      // Remove the last keyword on Backspace when input is empty
      onChange(values.slice(0, -1));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    commitValue(inputValue);
  };

  const removeKeyword = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleContainerClick = () => {
    if (!disabled && !focused) {
      inputRef.current?.focus();
      setFocused(true);
    }
  };

  return (
    <div>
      <div
        onClick={handleContainerClick}
        className={cn(
          "flex min-h-[120px] w-full flex-wrap items-start gap-1.5 rounded-md border border-input p-2 text-sm transition-colors",
          focused &&
            !disabled &&
            "border-primary ring-1 ring-primary/20 shadow-[0_0_4px_rgba(168,219,255,0.6)]",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        {values.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            <span className="max-w-[160px] truncate">{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeKeyword(i);
                }}
                className="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-primary/60 hover:bg-primary/20 hover:text-primary"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={values.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "inline-block h-6 min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-0",
          )}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}