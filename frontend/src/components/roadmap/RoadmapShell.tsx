import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoadmap } from "@/hooks/useRoadmap";
import { monthAbbr } from "@/lib/format";
import type { TaskResponse, TaskStatus } from "@/lib/types";

const COLUMNS: Array<{ key: TaskStatus; labelKey: string; bg: string }> = [
  { key: "todo", labelKey: "roadmap.columns.todo", bg: "bg-muted/50" },
  { key: "in_progress", labelKey: "roadmap.columns.in_progress", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "done", labelKey: "roadmap.columns.done", bg: "bg-green-50 dark:bg-green-950/30" },
];

export function RoadmapShell() {
  const { t } = useTranslation();
  const { tasks, loading, error, filter, setFilter, addTask, editTask, removeTask } = useRoadmap();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const tasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  }, [tasks]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      status: "todo",
      due_month: filter.month,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setShowCreate(false);
  };

  const handleMove = (task: TaskResponse, newStatus: TaskStatus) => {
    editTask(task.id, { status: newStatus });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("roadmap.title")}</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            {t("roadmap.addTask")}
          </Button>
        </div>

        {/* Month filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter({})}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              !filter.month ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("roadmap.allMonths")}
          </button>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              onClick={() => setFilter({ ...filter, month: m })}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filter.month === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {monthAbbr(m)}
            </button>
          ))}
        </div>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("roadmap.createTitle")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                placeholder={t("roadmap.taskPlaceholder")}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  {t("roadmap.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim()}>
                  {t("roadmap.create")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {/* Kanban board */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {COLUMNS.map((col) => (
              <div key={col.key} className={`${col.bg} rounded-2xl p-4 min-h-[200px]`}>
                <h3 className="font-semibold text-sm mb-4">
                  {t(col.labelKey)} ({tasksByStatus(col.key).length})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus(col.key).map((task) => (
                    <Card key={task.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {task.due_month && (
                            <Badge variant="outline" className="text-xs">
                              {monthAbbr(task.due_month)}
                            </Badge>
                          )}
                          {task.category && (
                            <Badge variant="secondary" className="text-xs">
                              {t(`roadmap.categories.${task.category}`, task.category)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 mt-3 text-xs">
                          {col.key !== "todo" && (
                            <button
                              onClick={() => handleMove(task, "todo")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              ← {t("roadmap.columns.todo")}
                            </button>
                          )}
                          {col.key !== "in_progress" && (
                            <button
                              onClick={() => handleMove(task, "in_progress")}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              → {t("roadmap.columns.in_progress")}
                            </button>
                          )}
                          {col.key !== "done" && (
                            <button
                              onClick={() => handleMove(task, "done")}
                              className="text-green-600 dark:text-green-400 hover:underline"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => removeTask(task.id)}
                            className="text-destructive/60 hover:text-destructive ml-auto"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}