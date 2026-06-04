import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Kanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoadmap } from "@/hooks/useRoadmap";
import { RoadmapBoard } from "./RoadmapBoard";
import { monthAbbr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Polished RoadmapShell — orchestrates the Kanban board with @dnd-kit while
// keeping the existing header, month filter, and create dialog.
//
// Replaces the former static grid layout with <RoadmapBoard />.
// ---------------------------------------------------------------------------

const COLUMNS: Array<{ key: TaskStatus; labelKey: string }> = [
  { key: "todo", labelKey: "roadmap.columns.todo" },
  { key: "in_progress", labelKey: "roadmap.columns.in_progress" },
  { key: "done", labelKey: "roadmap.columns.done" },
];

export function RoadmapShell() {
  const { t } = useTranslation();
  const {
    tasks,
    loading,
    error,
    filter,
    setFilter,
    addTask,
    editTask,
    removeTask,
    moveTask,
    reorder,
  } = useRoadmap();

  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMonth, setNewMonth] = useState<number>(
    filter.month ?? new Date().getMonth() + 1,
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      status: createStatus,
      due_month: newMonth,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setNewDescription("");
    setCreateStatus("todo");
    setShowCreate(false);
  };

  const openCreateDialog = useCallback((status: TaskStatus) => {
    setCreateStatus(status);
    setShowCreate(true);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Kanban className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t("roadmap.title")}
              </h1>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => openCreateDialog("todo")}
            className="gap-1.5 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            {t("roadmap.addTask")}
          </Button>
        </div>

        {/* Month filter pills */}
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter({})}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              !filter.month
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {t("roadmap.allMonths")}
          </button>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              onClick={() => setFilter({ ...filter, month: m })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                filter.month === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
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
              {/* Column picker */}
              <div className="flex gap-1.5">
                {COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setCreateStatus(col.key)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                      createStatus === col.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {t(col.labelKey)}
                  </button>
                ))}
              </div>

              <Input
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTitle(e.target.value)
                }
                placeholder={t("roadmap.taskPlaceholder")}
                className="h-10 rounded-lg"
                autoFocus
              />
              <Input
                value={newDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewDescription(e.target.value)
                }
                placeholder={t("roadmap.createDescription")}
                className="h-9 rounded-lg text-sm"
              />
              {/* Month selector */}
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setNewMonth(m)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                      newMonth === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {monthAbbr(m)}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
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

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Kanban board */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RoadmapBoard
            tasks={tasks}
            moveTask={moveTask}
            reorder={reorder}
            onEditTask={(id, body) => editTask(id, body)}
            onDeleteTask={removeTask}
            onAddCard={openCreateDialog}
          />
        )}
      </div>
    </div>
  );
}