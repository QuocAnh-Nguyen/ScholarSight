import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Kanban, Loader2, MoreHorizontal, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoadmap } from "@/hooks/useRoadmap";
import { monthAbbr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskResponse, TaskStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Polished RoadmapShell adapted from FastGPT's card patterns.
//
// Improvements:
//   - Column headers with count badges
//   - Task cards with hover elevation transitions
//   - Drag indicators (visual only — for future drag-and-drop)
//   - Empty column state with placeholder hint
//   - Create dialog with month selector
//   - Consistent card shadow/hover from FastGPT patterns
//
// FastGPT source: FastGPT-reference/pageComponents/dataset/list/List.tsx
// ---------------------------------------------------------------------------

interface ColumnConfig {
  key: TaskStatus;
  labelKey: string;
  bg: string;
  emptyHint: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "todo",
    labelKey: "roadmap.columns.todo",
    bg: "bg-muted/30",
    emptyHint: "No tasks to do 🎉",
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

export function RoadmapShell() {
  const { t } = useTranslation();
  const { tasks, loading, error, filter, setFilter, addTask, editTask, removeTask } = useRoadmap();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMonth, setNewMonth] = useState<number>(filter.month ?? new Date().getMonth() + 1);

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      status: "todo",
      due_month: newMonth,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setNewDescription("");
    setShowCreate(false);
  };

  const handleMove = (task: TaskResponse, newStatus: TaskStatus) => {
    editTask(task.id, { status: newStatus });
  };

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
              <h1 className="text-xl font-bold text-foreground">{t("roadmap.title")}</h1>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
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
              <Input
                value={newTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
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
          <div className="grid gap-6 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const columnTasks = tasksByStatus(col.key);
              const count = columnTasks.length;

              return (
                <div
                  key={col.key}
                  className={cn(
                    "flex flex-col rounded-2xl p-4 min-h-[300px]",
                    "border border-border/40",
                    col.bg,
                  )}
                >
                  {/* Column header with count badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(col.labelKey)}
                    </h3>
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

                  {/* Task cards */}
                  <div className="flex flex-1 flex-col gap-2.5">
                    {columnTasks.length === 0 && (
                      <div className="flex flex-1 items-center justify-center py-8">
                        <p className="text-xs text-muted-foreground/60 italic">{col.emptyHint}</p>
                      </div>
                    )}
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "group/card relative rounded-xl border bg-card p-3.5 shadow-sm",
                          "transition-all duration-150",
                          "hover:shadow-md hover:-translate-y-0.5",
                          "cursor-grab active:cursor-grabbing",
                        )}
                      >
                        {/* Drag handle indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-transparent group-hover/card:bg-primary/20 transition-colors" />

                        <p className="text-sm font-medium leading-snug text-foreground pr-4">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                        </div>

                        {/* Action buttons */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-border/30 pt-2">
                          <div className="flex gap-0.5">
                            {col.key !== "todo" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMove(task, "todo")}
                                title={t("roadmap.columns.todo")}
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                            )}
                            {col.key !== "in_progress" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                onClick={() => handleMove(task, "in_progress")}
                                title={t("roadmap.columns.in_progress")}
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                            {col.key !== "done" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                onClick={() => handleMove(task, "done")}
                                title={t("roadmap.columns.done")}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

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
                                onClick={() => removeTask(task.id)}
                              >
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}