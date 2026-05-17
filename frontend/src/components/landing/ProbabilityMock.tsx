import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export function ProbabilityMock() {
  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Dummy dropdowns — mock selection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            University
          </label>
          <Input
            value="Hanoi Univ. of Science & Tech"
            readOnly
            className="h-9 text-xs cursor-default bg-muted/30"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Major
          </label>
          <Input
            value="Computer Science (IT)"
            readOnly
            className="h-9 text-xs cursor-default bg-muted/30"
          />
        </div>
      </div>

      {/* Tier badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Your Tier:</span>
        <Badge
          variant="warning"
          className="gap-1.5 px-3 py-1 text-sm font-semibold"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          Target 🟡
        </Badge>
      </div>

      {/* Competitive gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Competitive Position</span>
          <span className="font-semibold text-foreground">85th Percentile</span>
        </div>
        <Progress value={85} className="h-3" />
        <p className="text-xs text-muted-foreground">
          Above 85% of applicants — Competitive but achievable
        </p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-lg border border-border/60 bg-background p-3 text-center">
          <p className="text-xs text-muted-foreground">Your Score</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">27.5</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background p-3 text-center">
          <p className="text-xs text-muted-foreground">2024 Cutoff</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">27.0</p>
        </div>
      </div>

      {/* Mini distribution hint */}
      <div className="rounded-lg border border-dashed border-border/60 bg-background/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Score Distribution (2024)
        </p>
        <div className="flex items-end gap-1.5 h-14">
          {[15, 30, 55, 75, 90, 78, 60, 45, 25, 12].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-colors"
              style={{
                height: `${h}%`,
                backgroundColor:
                  i === 7 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)",
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>22</span>
          <span>24</span>
          <span>26</span>
          <span>28</span>
          <span>30</span>
        </div>
      </div>
    </div>
  );
}