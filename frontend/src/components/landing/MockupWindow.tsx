import { ChatMock } from "@/components/landing/ChatMock";
import { ProbabilityMock } from "@/components/landing/ProbabilityMock";
import { Sun, Moon } from "lucide-react";

export function MockupWindow() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-border shadow-xl bg-card">
        {/* macOS chrome bar */}
        <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/50 px-4 py-2.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
          <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs text-muted-foreground/60">
            AdmissionsAI — Demo
          </span>
        </div>

        {/* Mockup nav bar */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold tracking-tight text-foreground">
              AdmissionsAI
            </span>
            <nav className="flex items-center gap-1">
              <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Chat
              </span>
              <span className="rounded-md px-3 py-1 text-xs text-muted-foreground">
                Probability
              </span>
              <span className="rounded-md px-3 py-1 text-xs text-muted-foreground">
                Roadmap
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              Docs
            </span>
            <span className="text-xs text-muted-foreground border border-border/60 rounded px-2 py-0.5 cursor-pointer">
              EN ▾
            </span>
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <Moon className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm">
              Try Demo
            </span>
          </div>
        </div>

        {/* Split-pane body */}
        <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/40 bg-background">
          {/* Chat side (wider) */}
          <div className="md:col-span-3">
            <ChatMock />
          </div>
          {/* Probability panel side */}
          <div className="md:col-span-2 bg-muted/20">
            <ProbabilityMock />
          </div>
        </div>
      </div>
    </div>
  );
}