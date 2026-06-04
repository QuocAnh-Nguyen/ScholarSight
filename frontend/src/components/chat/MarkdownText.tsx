import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import type { Components } from "react-markdown";
import { Code } from "./CodeBlock";
import { InlineCitation } from "./InlineCitation";
import { remarkCitationLink } from "@/lib/remarkCitationLink";
import type { SourceCitation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Enhanced Markdown renderer adapted from FastGPT's Markdown/index.tsx.
//
// Key additions (over the baseline react-markdown + remarkGfm renderer):
//   - LaTeX / KaTeX math rendering (remark-math + rehype-katex)
//   - Syntax-highlighted code blocks with copy button (CodeBlock component)
//   - External links open in new tab (rehype-external-links)
//   - Inline citation parsing: `[Tài liệu: uuid]` → clickable badge
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
  /** Citations for this message — used to look up docId → SourceCitation on inline click. */
  citations?: SourceCitation[];
  /** Called when an inline citation badge is clicked. */
  onCitationClick?: (citation: SourceCitation) => void;
}

/** Maximum source length before we fall back to plain-text rendering. */
const MAX_SOURCE_LENGTH = 200_000;

/**
 * Wrap `pre` children so that `<code>` blocks receive `codeBlock: true`.
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

/** Build a docId → SourceCitation lookup map for O(1) inline citation resolution. */
function buildCitationMap(
  citations?: SourceCitation[],
): Map<string, SourceCitation> {
  const map = new Map<string, SourceCitation>();
  if (!citations) return map;
  for (const c of citations) {
    map.set(c.doc_id, c);
  }
  return map;
}

/** Components map consumed by react-markdown. */
function useComponents(
  citationMap: Map<string, SourceCitation>,
  onCitationClick?: (citation: SourceCitation) => void,
): Components {
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

      // Custom citationLink node rendered as an inline clickable badge
      citationLink: ({ node }: any) => {
        const docId = node?.data?.docId as string | undefined;
        if (!docId) return null;

        const handleClick = (id: string) => {
          const citation = citationMap.get(id);
          if (citation && onCitationClick) {
            onCitationClick(citation);
          }
        };

        return <InlineCitation docId={docId} onClick={handleClick} />;
      },
    }),
    [citationMap, onCitationClick],
  );
}

export function MarkdownText({
  content,
  isStreaming,
  citations,
  onCitationClick,
}: MarkdownTextProps) {
  const citationMap = useMemo(() => buildCitationMap(citations), [citations]);
  const components = useComponents(citationMap, onCitationClick);

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
        remarkPlugins={[remarkGfm, remarkMath, remarkCitationLink]}
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
