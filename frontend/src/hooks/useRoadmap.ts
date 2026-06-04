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
  /** Move a task to a new column + position (optimistic) */
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
   * persists the status change via the API.  Rolls back on failure.
   */
  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus, newIndex: number) => {
      if (!token) return;

      const snapshot = tasksRef.current;
      const target = snapshot.find((t) => t.id === taskId);
      if (!target) return;

      // 1. Build optimistic state
      const withoutTarget = snapshot.filter((t) => t.id !== taskId);
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
        setTasks((prev) => prev.map((t) => (t.id === taskId ? serverTask : t)));
      } catch (e) {
        setError((e as Error).message);
        setTasks(snapshot); // rollback
      }
    },
    [token],
  );

  const reorder = useCallback(
    async (items: ReorderItem[]) => {
      if (!token) return;
      const snapshot = tasksRef.current;
      try {
        // Optimistic: apply sort_order updates immediately
        setTasks((prev) =>
          prev.map((t) => {
            const match = items.find((ri) => ri.task_id === t.id);
            return match ? { ...t, sort_order: match.sort_order } : t;
          }),
        );
        await reorderTasks(token, items);
      } catch (e) {
        setError((e as Error).message);
        setTasks(snapshot); // rollback
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