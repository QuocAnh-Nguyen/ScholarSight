export function KanbanMock() {
  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-4">
        {/* To Do column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
            <span className="text-xs font-semibold text-foreground">To Do</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              1
            </span>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-3 shadow-sm border-l-[3px] border-l-blue-400">
            <p className="text-xs font-medium text-foreground leading-snug">
              Prepare SAT documents
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              AI Suggested
            </span>
          </div>
        </div>

        {/* In Progress column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-foreground">
              In Progress
            </span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              1
            </span>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-3 shadow-sm border-l-[3px] border-l-amber-400">
            <p className="text-xs font-medium text-foreground leading-snug">
              Review Math for High School Graduation Exam
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
              In Progress
            </span>
          </div>
        </div>

        {/* Done column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-foreground">Done</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              0
            </span>
          </div>
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/10 p-6">
            <span className="text-[11px] text-muted-foreground">
              No completed tasks yet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}