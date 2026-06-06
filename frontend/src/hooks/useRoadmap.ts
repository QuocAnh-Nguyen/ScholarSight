import { useCallback, useEffect, useRef, useState } from "react";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask as apiDeleteTask,
  reorderTasks,
} from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type {
  ReorderItem,
  TaskCreate,
  TaskFilter,
  TaskResponse,
  TaskStatus,
  TaskUpdate,
} from "@/lib/types";

export function useRoadmap(): {
  tasks: TaskResponse[];
  loading: boolean;
  error: string | null;
  filter: TaskFilter;
  setFilter: (f: TaskFilter) => void;
  refresh: () => Promise<void>;
  addTask: (body: TaskCreate) => Promise<void>;
  editTask: (id: string, body: TaskUpdate) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  /** Move a task to a new column + position (optimistic).
   *  Also reorders the destination column on success (Fix #2B). */
  moveTask: (
    taskId: string,
    newStatus: TaskStatus,
    newIndex: number,
  ) => Promise<void>;
  /** Persist reorder of cards within the same column */
  reorder: (items: ReorderItem[]) => Promise<void>;
} {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>({});
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // -----------------------------------------------------------------------
  // Fix #2C: Per-task snapshots for isolated rollback.
  // Previously a single `snapshot` captured the full array, so a rollback
  // for Task A could wipe out Task B's successful concurrent move.
  // Now each task's pre-mutation state is stored independently.
  // -----------------------------------------------------------------------
  const taskSnapshotsRef = useRef<Map<string, TaskResponse>>(new Map());

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listTasks(token, filter);
      setTasks(items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(
    async (body: TaskCreate) => {
      if (!token) return;
      try {
        const created = await createTask(token, body);
        setTasks((prev) => [...prev, created]);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [token],
  );

  const editTask = useCallback(
    async (id: string, body: TaskUpdate) => {
      if (!token) return;
      try {
        const updated = await updateTask(token, id, body);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [token],
  );

  const removeTask = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await apiDeleteTask(token, id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [token],
  );

  /**
   * Optimistic move: immediately moves the task in local state, then
   * persists the status change via the API.  Rolls back ONLY the failed
   * task on error (Fix #2C).  After success, reorders the destination
   * column so sort_orders stay sequential (Fix #2B).
   */
  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus, newIndex: number) => {
      if (!token) return;

      const currentTasks = tasksRef.current;
      const target = currentTasks.find((t) => t.id === taskId);
      if (!target) return;

      // ------------------------------------------------------------------
      // Fix #2C: Snapshot ONLY this task before mutating.
      // ------------------------------------------------------------------
      if (!taskSnapshotsRef.current.has(taskId)) {
        taskSnapshotsRef.current.set(taskId, { ...target });
      }

      // 1. Build optimistic state
      const withoutTarget = currentTasks.filter((t) => t.id !== taskId);
      const sameColTasks = withoutTarget
        .filter((t) => t.status === newStatus)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const updatedTask: TaskResponse = {
        ...target,
        status: newStatus,
        sort_order: newIndex,
      };

      sameColTasks.splice(newIndex, 0, updatedTask);
      const optimisticState = [
        ...withoutTarget.filter((t) => t.status !== newStatus),
        ...sameColTasks.map((t, i) => ({ ...t, sort_order: i })),
      ];

      setTasks(optimisticState);

      // 2. Persist
      try {
        const serverTask = await updateTask(token, taskId, {
          status: newStatus,
          sort_order: newIndex,
        });

        // ------------------------------------------------------------------
        // Fix #2B: After a cross-column move succeeds, reorder the
        // destination column so all tasks have sequential sort_order.
        // ------------------------------------------------------------------
        const destColTasks = optimisticState
          .filter((t) => t.status === newStatus)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const destReorderItems: ReorderItem[] = destColTasks.map((t, i) => ({
          task_id: t.id,
          sort_order: i,
        }));
        await reorderTasks(token, destReorderItems);

        setTasks((prev) => prev.map((t) => (t.id === taskId ? serverTask : t)));
        taskSnapshotsRef.current.delete(taskId);
      } catch (e) {
        setError((e as Error).message);
        // ------------------------------------------------------------------
        // Fix #2C: Roll back ONLY the failed task, not the entire array.
        // ------------------------------------------------------------------
        const snap = taskSnapshotsRef.current.get(taskId);
        if (snap) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? snap : t)));
          taskSnapshotsRef.current.delete(taskId);
        }
      }
    },
    [token],
  );

  const reorder = useCallback(
    async (items: ReorderItem[]) => {
      if (!token) return;

      // ------------------------------------------------------------------
      // Fix #2C: Snapshot each reordered task individually.
      // ------------------------------------------------------------------
      const currentTasks = tasksRef.current;
      for (const item of items) {
        if (!taskSnapshotsRef.current.has(item.task_id)) {
          const t = currentTasks.find((t) => t.id === item.task_id);
          if (t) {
            taskSnapshotsRef.current.set(item.task_id, { ...t });
          }
        }
      }

      try {
        // Optimistic: apply sort_order updates immediately
        setTasks((prev) =>
          prev.map((t) => {
            const match = items.find((ri) => ri.task_id === t.id);
            return match ? { ...t, sort_order: match.sort_order } : t;
          }),
        );
        await reorderTasks(token, items);
        // Success — clear snapshots
        for (const item of items) {
          taskSnapshotsRef.current.delete(item.task_id);
        }
      } catch (e) {
        setError((e as Error).message);
        // ------------------------------------------------------------------
        // Fix #2C: Roll back only the failed tasks individually.
        // ------------------------------------------------------------------
        setTasks((prev) =>
          prev.map((t) => {
            const snap = taskSnapshotsRef.current.get(t.id);
            return snap ?? t;
          }),
        );
        for (const item of items) {
          taskSnapshotsRef.current.delete(item.task_id);
        }
      }
    },
    [token],
  );

  return {
    tasks,
    loading,
    error,
    filter,
    setFilter,
    refresh,
    addTask,
    editTask,
    removeTask,
    moveTask,
    reorder,
  };
}
