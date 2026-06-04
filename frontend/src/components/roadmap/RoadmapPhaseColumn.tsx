import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoadmapTopicCard } from "./RoadmapTopicCard";
import { cn } from "@/lib/utils";
import type { TaskResponse, TaskStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Droppable column representing a roadmap phase / milestone.
// Adapted from react-trello's Lane with DnD-kit's useDroppable +
// SortableContext for card-level drag-and-drop.
// ---------------------------------------------------------------------------

interface RoadmapPhaseColumnProps {
  status: TaskStatus;
  title: string;
  tasks: TaskResponse[];
  bg: string;
  emptyHint: string;
  isOver: boolean;
  onAddCard: (status: TaskStatus) => void;
  onEditTask: (id: string, body: import("@/lib/types").TaskUpdate) => void;
  onDeleteTask: (id: string) => void;
}

export function RoadmapPhaseColumn({
  status,
  title,
  tasks,
  bg,
  emptyHint,
  isOver,
  onAddCard,
  onEditTask,
  onDeleteTask,
}: RoadmapPhaseColumnProps) {
  const { t } = useTranslation();

  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
  });

  const count = tasks.length;
  const sortableIds = tasks.map((t) => t.id);

  const columnDropClass = cn(
    isOver ? "ring-2 ring-primary/50 bg-primary/5" : "",
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl p-4 min-h-[300px] transition-colors duration-150",
        "border border-border/40",
        bg,
        columnDropClass,
      )}
    >
      {/* Column header with count badge */}
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge
          variant="secondary"
          className={cn(
            "ml-auto h-5 min-w-5 rounded-full px-1.5 text-[11px] font-medium",
            count === 0 && "opacity-50",
          )}
        >
          {count}
        </Badge>
      </div>

      {/* Sortable card list */}
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2.5">
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-muted-foreground/60 italic">{emptyHint}</p>
            </div>
          )}
          {tasks.map((task) => (
            <RoadmapTopicCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add card button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-8 gap-1 text-xs text-muted-foreground hover:text-foreground justify-start rounded-lg"
        onClick={() => onAddCard(status)}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("roadmap.addTopic", "Add topic")}
      </Button>
    </div>
  );
}