import type { Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin that detects `[Tài liệu: <uuid>]` patterns in text nodes
 * and replaces them with `citationLink` MDAST nodes.
 *
 * Pattern: [Tài liệu: <doc_id>]
 * - Captures the doc_id (UUID or slug)
 * - Replaces the bracketed text with a `citationLink` node
 */
const CITATION_REGEX = /\[Tài liệu:\s*([^\]]+)\]/g;

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
