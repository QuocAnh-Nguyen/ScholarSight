import type { Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin that detects citation patterns in text nodes and replaces
 * them with `citationLink` MDAST nodes.
 *
 * FIX 2A: Regex now matches BOTH formats the backend LLM can produce:
 *   - [Tài liệu: <uuid>]   (labeled, from the system prompt)
 *   - [<uuid>]             (bare, if the LLM omits the label)
 * The UUID is validated as 8-4-4-4-12 hex digits to avoid false positives
 * on other bracketed text.
 */
const CITATION_REGEX = /\[(?:Tài\s*liệu\s*:\s*)?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]/g;

interface CitationLinkNode {
  type: "citationLink";
  data: {
    docId: string;
  };
  children: [];
}

// Extend the mdast module to recognize our custom node
declare module "mdast" {
  interface RootContentMap {
    citationLink: CitationLinkNode;
  }
}

export function remarkCitationLink() {
  return function transformer(tree: Root) {
    visit(tree, "text", (node: Text, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const value = node.value;
      CITATION_REGEX.lastIndex = 0;

      const matches: Array<{ start: number; end: number; docId: string; full: string }> = [];
      let match: RegExpExecArray | null;
      while ((match = CITATION_REGEX.exec(value)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          docId: match[1].trim(),
          full: match[0],
        });
      }

      if (matches.length === 0) return;

      const replacementNodes: any[] = [];
      let cursor = 0;

      for (const m of matches) {
        // Text before the match
        if (m.start > cursor) {
          replacementNodes.push({
            type: "text",
            value: value.slice(cursor, m.start),
          });
        }

        // Citation link node
        replacementNodes.push({
          type: "citationLink",
          data: { docId: m.docId },
          children: [],
        });

        cursor = m.end;
      }

      // Remaining text after the last match
      if (cursor < value.length) {
        replacementNodes.push({
          type: "text",
          value: value.slice(cursor),
        });
      }

      // Replace the original text node with our new nodes
      parent.children.splice(index, 1, ...replacementNodes);
      // Return index to skip past inserted nodes
      return index + replacementNodes.length;
    });
  };
}
