import { useCallback, useMemo, useState } from "react";
import {
  closestCorners,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TaskResponse, TaskStatus, ReorderItem } from "@/lib/types";

export interface BoardColumn {
  status: TaskStatus;
  tasks: TaskResponse[];
}

export function useRoadmapBoard(
  tasks: TaskResponse[],
  moveTask: (taskId: string, newStatus: TaskStatus, newIndex: number) => Promise<void>,
  reorder: (items: ReorderItem[]) => Promise<void>,
) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group tasks by status
  const columns = useMemo((): Record<TaskStatus, TaskResponse[]> => {
    const grouped: Record<TaskStatus, TaskResponse[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const t of tasks) {
      const s = t.status;
      if (grouped[s]) grouped[s].push(t);
    }
    // Sort each column by sort_order
    for (const key of Object.keys(grouped) as TaskStatus[]) {
      grouped[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return grouped;
  }, [tasks]);

  // Active task (for DragOverlay)
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId) ?? null,
    [tasks, activeId],
  );

  // Sensors: pointer (8px activation) + keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Custom collision detection — combines closestCorners + pointerWithin for
  // better cross-column drop detection
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // Use rectIntersection first for cross-column drops,
      // then fall back to closestCorners for within-column sorting
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) return pointerCollisions;

      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) return rectCollisions;

      return closestCorners(args);
    },
    [],
  );

  // -- Drag Start ----------------------------------------------------------
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  // -- Drag Over -----------------------------------------------------------
  // Track which column the card is over (for visual highlight)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) return;

      const overId = String(over.id);

      // Determine the column of the item being dragged over
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        setOverColumn(overTask.status as TaskStatus);
      } else {
        // overId may be a column droppable id ("column-{status}")
        if (overId.startsWith("column-")) {
          setOverColumn(overId.replace("column-", "") as TaskStatus);
        }
      }
    },
    [tasks],
  );

  // -- Drag End ------------------------------------------------------------
  //
  // Fix #2B: Cross-column moves call moveTask() which now internally
  // reorders the destination column after persisting the status change.
  // Same-column reorders call reorder() directly.
  //
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumn(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) return;

      // Find the source and destination columns
      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      let destStatus: TaskStatus;
      let destIndex: number;

      // Check if dropping on another task or on a column droppable
      if (overId.startsWith("column-")) {
        // Dropped directly on the column (empty area)
        destStatus = overId.replace("column-", "") as TaskStatus;
        destIndex = columns[destStatus]?.length ?? 0;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (!overTask) return;
        destStatus = overTask.status as TaskStatus;
        const colTasks = columns[destStatus] ?? [];
        destIndex = colTasks.findIndex((t) => t.id === overId);
        if (destIndex < 0) destIndex = colTasks.length;
      }

      if (activeTask.status === destStatus) {
        // Same column → reorder
        const colTasks = columns[destStatus] ?? [];
        const oldIndex = colTasks.findIndex((t) => t.id === activeId);
        if (oldIndex < 0) return;

        // Build new order
        const reordered = [...colTasks];
        const [moved] = reordered.splice(oldIndex, 1);
        const insertAt = oldIndex < destIndex ? destIndex - 1 : destIndex;
        reordered.splice(insertAt, 0, moved);

        const reorderItems: ReorderItem[] = reordered.map((t, i) => ({
          task_id: t.id,
          sort_order: i,
        }));
        await reorder(reorderItems);
      } else {
        // ------------------------------------------------------------------
        // Fix #2B: Cross-column move — moveTask() now handles both the
        // status change AND the destination column reorder internally.
        // We no longer need a separate reorder() call here.
        // ------------------------------------------------------------------
        await moveTask(activeId, destStatus, destIndex);
      }
    },
    [tasks, columns, moveTask, reorder],
  );

  return {
    columns,
    activeId,
    activeTask,
    overColumn,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
