import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownTextProps {
  content: string;
}

export function MarkdownText({ content }: MarkdownTextProps) {
  return (
    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Preload the MarkdownText component for snappier rendering. */
export function preloadMarkdownText(): void {
  // Import is cached after first render; no-op trigger.
}