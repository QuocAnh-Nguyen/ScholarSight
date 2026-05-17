import { ChatMock } from "@/components/landing/ChatMock";
import { ProbabilityMock } from "@/components/landing/ProbabilityMock";
import { KanbanMock } from "@/components/landing/KanbanMock";

type DemoFeature = "chat" | "probability" | "roadmap";

interface MockupWindowProps {
  activeTab: DemoFeature;
}

export function MockupWindow({ activeTab }: MockupWindowProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl bg-card">
      {/* macOS chrome bar */}
      <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/50 px-4 py-2.5">
        <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
        <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
        <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground/50">
          admissions-ai-demo
        </span>
      </div>

      {/* Dynamic body based on active tab */}
      <div className="bg-background">
        {activeTab === "chat" && <ChatMock />}
        {activeTab === "probability" && <ProbabilityMock />}
        {activeTab === "roadmap" && <KanbanMock />}
      </div>
    </div>
  );
}