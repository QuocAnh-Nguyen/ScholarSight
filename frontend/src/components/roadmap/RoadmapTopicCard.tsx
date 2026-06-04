import { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { GripVertical, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { monthAbbr } from "@/lib/format";
import type { TaskResponse, TopicDifficulty } from "@/lib/types";

// ---------------------------------------------------------------------------
// Draggable learning-topic card for the roadmap Kanban board.
// Extracted from react-trello Card patterns + existing RoadmapShell card styling.
// ---------------------------------------------------------------------------

const DIFFICULTY_CLASSES: Record<TopicDifficulty, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatStudyTime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

interface RoadmapTopicCardProps {
  task: TaskResponse;
  onEdit: (id: string, body: import("@/lib/types").TaskUpdate) => void;
  onDelete: (id: string) => void;
}

export function RoadmapTopicCard({ task, onEdit, onDelete }: RoadmapTopicCardProps) {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleCompleted = useCallback(
    (checked: boolean | "indeterminate") => {
      if (typeof checked === "boolean") {
        onEdit(task.id, { completed: checked });
      }
    },
    [onEdit, task.id],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card relative rounded-xl border bg-card p-3.5 shadow-sm",
        "transition-all duration-150",
        "hover:shadow-md hover:-translate-y-0.5",
        isDragging ? "opacity-50 shadow-xl rotate-1" : "opacity-100",
        task.completed && "opacity-70",
      )}
    >
      {/* Drag handle + left accent bar */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors",
          isDragging
            ? "bg-primary"
            : "bg-transparent group-hover/card:bg-primary/20",
        )}
      />
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-1.5 top-3 cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-60 transition-opacity",
          "touch-none",
        )}
        aria-label={t("roadmap.dragHint")}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Title */}
      <div className="flex items-start gap-2 pl-1">
        <input
          type="checkbox"
          checked={task.completed ?? false}
          onChange={(e) => handleToggleCompleted(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-primary"
          aria-label={t("roadmap.completed")}
        />
        <p
          className={cn(
            "text-sm font-medium leading-snug text-foreground pr-4",
            task.completed && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2 pl-6">
          {task.description}
        </p>
      )}

      {/* Meta badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6">
        {task.due_month && (
          <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
            {monthAbbr(task.due_month)}
          </Badge>
        )}
        {task.category && (
          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
            {t(`roadmap.categories.${task.category}`, task.category)}
          </Badge>
        )}
        {task.difficulty && (
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              DIFFICULTY_CLASSES[task.difficulty as TopicDifficulty] ??
                DIFFICULTY_CLASSES.beginner,
            )}
          >
            {t(`roadmap.difficulty.${task.difficulty}`, task.difficulty)}
          </span>
        )}
        {task.estimated_time != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <span>⏱</span>
            {formatStudyTime(task.estimated_time)}
          </span>
        )}
        {task.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Resource links */}
      {task.resource_links && task.resource_links.length > 0 && (
        <div className="mt-2 border-t border-border/30 pt-2 pl-6">
          <div className="flex flex-wrap gap-1">
            {task.resource_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline truncate max-w-[160px]"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                {link.label || link.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-2.5 flex items-center justify-end border-t border-border/30 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 transition-opacity group-hover/card:opacity-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive text-xs"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="mr-1.5 h-3 w-3" />
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Static, non-draggable version used inside DragOverlay */
export function RoadmapTopicCardOverlay({ task }: { task: TaskResponse }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-xl rotate-2 opacity-90 pointer-events-none">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed ?? false}
          readOnly
          className="mt-0.5 h-4 w-4 cursor-default rounded border-border accent-primary"
          aria-hidden
        />
        <p
          className={cn(
            "text-sm font-medium leading-snug text-foreground",
            task.completed && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
      </div>
      {task.description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2 pl-6">
          {task.description}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6">
        {task.due_month && (
          <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
            {monthAbbr(task.due_month)}
          </Badge>
        )}
        {task.difficulty && (
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              DIFFICULTY_CLASSES[task.difficulty as TopicDifficulty] ??
                DIFFICULTY_CLASSES.beginner,
            )}
          >
            {t(`roadmap.difficulty.${task.difficulty}`, task.difficulty)}
          </span>
        )}
      </div>
    </div>
  );
}