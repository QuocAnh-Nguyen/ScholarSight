import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import type { Components } from "react-markdown";
import { Code } from "./CodeBlock";

// ---------------------------------------------------------------------------
// Enhanced Markdown renderer adapted from FastGPT's Markdown/index.tsx.
//
// Key additions (over the baseline react-markdown + remarkGfm renderer):
//   - LaTeX / KaTeX math rendering (remark-math + rehype-katex)
//   - Syntax-highlighted code blocks with copy button (CodeBlock component)
//   - External links open in new tab (rehype-external-links)
//   - Large-content fallback: raw text for sources > 200K chars
//
// FastGPT sources:
//   FastGPT-reference/components/Markdown/index.tsx
//   FastGPT-reference/components/Markdown/codeBlock/CodeLight.tsx
// ---------------------------------------------------------------------------

interface MarkdownTextProps {
  content: string;
  /** When true, appends a blinking cursor indicator to the last element. */
  isStreaming?: boolean;
}

/** Maximum source length before we fall back to plain-text rendering. */
const MAX_SOURCE_LENGTH = 200_000;

/**
 * Wrap `pre` children so that `<code>` blocks receive `codeBlock: true`.
 *
 * Mirrors FastGPT's `RewritePre` helper in Markdown/index.tsx.
 */
function RewritePre({ children }: { children: React.ReactNode }) {
  const modifiedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { codeBlock: true } as Record<string, unknown>);
    }
    return child;
  });

  return <>{modifiedChildren}</>;
}

/** Components map consumed by react-markdown. */
function useComponents(): Components {
  return useMemo<Components>(
    () => ({
      pre: ({ children }) => <RewritePre>{children}</RewritePre>,

      code: ({ children, className, ...rest }: React.ComponentPropsWithoutRef<"code"> & {
        codeBlock?: boolean;
      }) => {
        const codeBlock = (rest as Record<string, unknown>).codeBlock as boolean | undefined;
        const match =
          typeof className === "string"
            ? /\blanguage-(\w+)/.exec(className)
            : null;

        return (
          <Code
            className={className}
            codeBlock={codeBlock}
            match={match}
          >
            {children}
          </Code>
        );
      },

      // No custom link component needed — rehype-external-links handles `target="_blank"`.
      // No custom img component needed — default behavior is fine.
      // No custom table, mermaid, echarts, video, audio blocks (deferred).
    }),
    [],
  );
}

export function MarkdownText({ content, isStreaming }: MarkdownTextProps) {
  const components = useComponents();

  // --- Large-content fallback (FastGPT pattern) ------------------------------
  if (content.length >= MAX_SOURCE_LENGTH) {
    return <div className="whitespace-pre-wrap break-words text-sm">{content}</div>;
  }

  // --- Streaming placeholder — when waiting for the first token ------------
  if (isStreaming && content.length === 0) {
    return (
      <div className="markdown-content prose prose-sm dark:prose-invert max-w-none break-words">
        <div className="streaming-placeholder" />
      </div>
    );
  }

  return (
    <div
      className={[
        "markdown-content prose prose-sm dark:prose-invert max-w-none break-words",
        isStreaming ? "streaming-cursor" : "",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Preload the MarkdownText component for snappier rendering. */
export function preloadMarkdownText(): void {
  // Import is cached after first render; no-op trigger.
}

// ---------------------------------------------------------------------------
// Re-export CodeBlock for convenience
// ---------------------------------------------------------------------------
export { Code } from "./CodeBlock";