import { useCallback, useEffect, useState } from "react";
import { listTasks, createTask, updateTask, deleteTask as apiDeleteTask } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import type { TaskCreate, TaskFilter, TaskResponse, TaskUpdate } from "@/lib/types";

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
} {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>({});

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

  const addTask = useCallback(async (body: TaskCreate) => {
    if (!token) return;
    try {
      const created = await createTask(token, body);
      setTasks((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  const editTask = useCallback(async (id: string, body: TaskUpdate) => {
    if (!token) return;
    try {
      const updated = await updateTask(token, id, body);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  const removeTask = useCallback(async (id: string) => {
    if (!token) return;
    try {
      await apiDeleteTask(token, id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  return { tasks, loading, error, filter, setFilter, refresh, addTask, editTask, removeTask };
}