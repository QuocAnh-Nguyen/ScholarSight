import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// ---------------------------------------------------------------------------
// Adapted from FastGPT's Markdown/codeBlock/CodeLight.tsx
//   - Dark header bar with language label + copy button
//   - ``react-syntax-highlighter`` with oneDark (VS Code Dark+) theme
//   - Inline ``<code>`` styling for non-block code spans
//   - Clipboard copy with temporary "copied" checkmark state
// ---------------------------------------------------------------------------

export interface CodeBlockProps {
  children: ReactNode;
  className?: string;
  /** When true, renders as a fenced code block. Otherwise inline `<code>`. */
  codeBlock?: boolean;
  /** match[1] = language identifier extracted from the fenced code info string */
  match: RegExpExecArray | null;
}

/**
 * Derive the displayed label from the code-fence language token and optional
 * ``#title`` suffix (e.g. ``typescript#example`` → label "example").
 */
function resolveCodeLabel(
  match: RegExpExecArray | null,
): string | undefined {
  const input = match?.input ?? "";
  if (!input) return match?.[1];
  const splitInput = input.split("#");
  return splitInput[1] || match?.[1];
}

/**
 * Code block with syntax highlighting and a copy-to-clipboard button.
 *
 * FastGPT source: FastGPT-reference/components/Markdown/codeBlock/CodeLight.tsx
 */
function CodeBlockShell({ children, match }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const label = useMemo(() => resolveCodeLabel(match), [match]);
  const language = useMemo(() => match?.[1], [match]);

  const handleCopy = async () => {
    const text = String(children).replace(/&nbsp;/g, " ");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silently fail
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div
      className={[
        "my-3 overflow-hidden rounded-md",
        "shadow-[0px_0px_1px_0px_rgba(19,51,107,0.08),0px_1px_2px_0px_rgba(19,51,107,0.05)]",
      ].join(" ")}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between bg-[#282c34] px-4 py-2 text-sm select-none"
        style={{ color: "#abb2bf" }}
      >
        <span className="truncate text-xs font-medium uppercase tracking-wide opacity-75">
          {label ?? language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="group flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-white/10"
          title={t("common.copy")}
          aria-label={copied ? t("common.copied") : t("common.copy")}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
          )}
          <span className={copied ? "text-emerald-400" : ""}>
            {copied ? t("common.copied") : t("common.copy")}
          </span>
        </button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="pre"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8125rem",
          lineHeight: "1.6",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
          },
        }}
      >
        {String(children).replace(/&nbsp;/g, " ")}
      </SyntaxHighlighter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public API — the Code component used by react-markdown
// ---------------------------------------------------------------------------

/**
 * Custom react-markdown ``code`` renderer.
 *
 * When wrapped in a ``<pre>`` block (``codeBlock === true``), renders the full
 * syntax-highlighted block with copy support.  Otherwise renders a simple
 * inline ``<code>`` span.
 */
export function Code({ children, className, codeBlock, match }: CodeBlockProps) {
  if (codeBlock) {
    return (
      <CodeBlockShell
        className={className}
        codeBlock={codeBlock}
        match={match}
        children={children}
      />
    );
  }

  return (
    <code
      className={[
        "rounded bg-muted/70 px-1.5 py-0.5 text-[0.85em]",
        "font-mono text-foreground/90",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </code>
  );
}

export default Code;