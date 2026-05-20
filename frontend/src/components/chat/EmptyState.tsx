import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GitCompare,
  Lightbulb,
  Quote,
  ArrowUpRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Enhanced EmptyState adapted from FastGPT's chat Guide + QuestionGuide patterns.
//
// Replaces the static text empty state with an interactive grid of suggested
// prompts tailored to the ScholarSight academic/research context.
//
// FastGPT sources:
//   FastGPT-reference/components/Markdown/chat/Guide.tsx
//   FastGPT-reference/components/Markdown/chat/QuestionGuide.tsx
// ---------------------------------------------------------------------------

interface PromptCard {
  icon: typeof BookOpen;
  titleKey: string;
  descKey: string;
  promptKey: string;
}

const PROMPTS: PromptCard[] = [
  {
    icon: BookOpen,
    titleKey: "chat.suggestedPrompts.summarize.title",
    descKey: "chat.suggestedPrompts.summarize.desc",
    promptKey: "chat.suggestedPrompts.summarize.prompt",
  },
  {
    icon: GitCompare,
    titleKey: "chat.suggestedPrompts.compare.title",
    descKey: "chat.suggestedPrompts.compare.desc",
    promptKey: "chat.suggestedPrompts.compare.prompt",
  },
  {
    icon: Lightbulb,
    titleKey: "chat.suggestedPrompts.explain.title",
    descKey: "chat.suggestedPrompts.explain.desc",
    promptKey: "chat.suggestedPrompts.explain.prompt",
  },
  {
    icon: Quote,
    titleKey: "chat.suggestedPrompts.citations.title",
    descKey: "chat.suggestedPrompts.citations.desc",
    promptKey: "chat.suggestedPrompts.citations.prompt",
  },
];

interface EmptyStateProps {
  onPromptClick?: (prompt: string) => void;
}

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  const { t } = useTranslation();

  const handleClick = (promptKey: string) => {
    onPromptClick?.(t(promptKey));
  };

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t("chat.emptyTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
              {t("chat.emptyHint")}
            </p>
          </div>
        </div>

        {/* Suggested prompts grid */}
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.titleKey}
                onClick={() => handleClick(item.promptKey)}
                className={[
                  "group flex flex-col gap-2 rounded-xl border border-border/70",
                  "bg-card px-4 py-3.5 text-left shadow-sm transition-all",
                  "hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "active:scale-[0.98]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">
                    {t(item.titleKey)}
                  </span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {t(item.descKey)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground/60">{t("chat.emptyExample")}</p>
      </div>
    </div>
  );
}