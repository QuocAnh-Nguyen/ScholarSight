import {
  DndContext,
  DragOverlay,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { RoadmapPhaseColumn } from "./RoadmapPhaseColumn";
import { RoadmapTopicCardOverlay } from "./RoadmapTopicCard";
import { useRoadmapBoard } from "@/hooks/useRoadmapBoard";
import type { TaskResponse, TaskStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Top-level Kanban board for the learning roadmap.
// Wraps DndContext and renders three RoadmapPhaseColumn components — one for
// each TaskStatus.  Adapted from react-trello's Board + BoardContainer
// architecture, rebuilt with @dnd-kit.
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: TaskStatus;
  labelKey: string;
  bg: string;
  emptyHint: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "todo",
    labelKey: "roadmap.columns.todo",
    bg: "bg-muted/30",
    emptyHint: "No tasks to do",
  },
  {
    key: "in_progress",
    labelKey: "roadmap.columns.in_progress",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    emptyHint: "Nothing in progress",
  },
  {
    key: "done",
    labelKey: "roadmap.columns.done",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    emptyHint: "Complete some tasks!",
  },
];

interface RoadmapBoardProps {
  tasks: TaskResponse[];
  moveTask: (taskId: string, newStatus: TaskStatus, newIndex: number) => Promise<void>;
  reorder: (items: Array<{ task_id: string; sort_order: number }>) => Promise<void>;
  onEditTask: (id: string, body: import("@/lib/types").TaskUpdate) => void;
  onDeleteTask: (id: string) => void;
  onAddCard: (status: TaskStatus) => void;
}

export function RoadmapBoard({
  tasks,
  moveTask,
  reorder,
  onEditTask,
  onDeleteTask,
  onAddCard,
}: RoadmapBoardProps) {
  const { t } = useTranslation();
  const {
    activeTask,
    overColumn,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useRoadmapBoard(tasks, moveTask, reorder);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          return (
            <RoadmapPhaseColumn
              key={col.key}
              status={col.key}
              title={t(col.labelKey)}
              tasks={columnTasks}
              bg={col.bg}
              emptyHint={col.emptyHint}
              isOver={overColumn === col.key}
              onAddCard={onAddCard}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          );
        })}
      </div>

      {/* Drag overlay — renders a rotated, semi-transparent clone */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <RoadmapTopicCardOverlay task={activeTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}