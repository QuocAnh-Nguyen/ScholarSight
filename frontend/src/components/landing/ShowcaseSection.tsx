import { useState } from "react";
import { MessageSquare, BarChart3, Kanban } from "lucide-react";
import { MockupWindow } from "@/components/landing/MockupWindow";
import { cn } from "@/lib/utils";

type DemoFeature = "chat" | "probability" | "roadmap";

const tabs: { key: DemoFeature; label: string; icon: typeof MessageSquare }[] = [
  { key: "chat", label: "AI Chat & Citations", icon: MessageSquare },
  { key: "probability", label: "Probability Engine", icon: BarChart3 },
  { key: "roadmap", label: "Kanban Roadmap", icon: Kanban },
];

export function ShowcaseSection() {
  const [activeTab, setActiveTab] = useState<DemoFeature>("chat");

  return (
    <section className="py-20 bg-[#fafaf9] dark:bg-[#1d1d20] transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground">
          Intelligent Guidance — Answers you can trust
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Explore how AdmissionsAI works across each feature.
        </p>

        {/* Two-column layout: left tabs, right mockup */}
        <div className="mt-14 grid gap-6 md:grid-cols-[minmax(180px,220px)_1fr]">
          {/* Left: Vertical tabs */}
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-zinc-900 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Mockup window */}
          <div>
            <MockupWindow activeTab={activeTab} />
          </div>
        </div>
      </div>
    </section>
  );
}