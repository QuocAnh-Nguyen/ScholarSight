import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Microscope,
  GitCompare,
  Lightbulb,
  AlertTriangle,
  Quote,
  Library,
  ArrowRight,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QueryTemplate {
  id: string;
  icon: typeof BookOpen;
  titleKey: string;
  descKey: string;
  prompt: string;
}

const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: "summarize",
    icon: BookOpen,
    titleKey: "templates.summarize",
    descKey: "templates.summarizeDesc",
    prompt: "Provide a structured summary of this paper, covering the objectives, methods, key findings, and conclusions.",
  },
  {
    id: "methodology",
    icon: Microscope,
    titleKey: "templates.methodology",
    descKey: "templates.methodologyDesc",
    prompt: "Critically analyze the research methodology used in this paper. Discuss the strengths, weaknesses, and appropriateness of the chosen approach.",
  },
  {
    id: "compare",
    icon: GitCompare,
    titleKey: "templates.compare",
    descKey: "templates.compareDesc",
    prompt: "Compare and contrast the approaches, findings, and contributions of these papers. Highlight areas of agreement and disagreement.",
  },
  {
    id: "findings",
    icon: Lightbulb,
    titleKey: "templates.findings",
    descKey: "templates.findingsDesc",
    prompt: "Extract and list the key findings and main contributions of this paper. Organize them by significance.",
  },
  {
    id: "limitations",
    icon: AlertTriangle,
    titleKey: "templates.limitations",
    descKey: "templates.limitationsDesc",
    prompt: "Identify and discuss the limitations acknowledged by the authors and any additional limitations you observe.",
  },
  {
    id: "citations",
    icon: Quote,
    titleKey: "templates.citations",
    descKey: "templates.citationsDesc",
    prompt: "Generate properly formatted citations for this paper in APA, MLA, and Chicago styles.",
  },
  {
    id: "literature",
    icon: Library,
    titleKey: "templates.literature",
    descKey: "templates.literatureDesc",
    prompt: "Help me synthesize the findings across related works. How does this paper relate to and build upon prior research in the field?",
  },
  {
    id: "future",
    icon: ArrowRight,
    titleKey: "templates.future",
    descKey: "templates.futureDesc",
    prompt: "Based on the findings and limitations, suggest potential future research directions and open questions.",
  },
];

interface QueryTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: QueryTemplate) => void;
}

/**
 * Modal grid of academic query templates adapted from FastGPT's PromptTemplate.
 *
 * Displays a grid of pre-built academic prompt templates. Selecting one
 * inserts the prompt text into the chat composer.
 *
 * FastGPT source: FastGPT-reference/components/PromptTemplate/index.tsx
 */
export function QueryTemplateModal({ open, onOpenChange, onSelect }: QueryTemplateModalProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = () => {
    const template = QUERY_TEMPLATES.find((tp) => tp.id === selectedId);
    if (template) {
      onSelect(template);
      setSelectedId(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSelectedId(null);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {t("templates.title")}
          </DialogTitle>
          <DialogDescription>
            {t("templates.title")} — select a prompt template to jump-start your query.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-h-[420px] overflow-y-auto py-2 scrollbar-thin">
          {QUERY_TEMPLATES.map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === selectedId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t(item.titleKey)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t(item.descKey)}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedId} onClick={handleSelect}>
            {t("templates.useTemplate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { QUERY_TEMPLATES };