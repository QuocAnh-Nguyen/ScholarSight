import { CheckCircle, BarChart3, Kanban } from "lucide-react";
import { FeatureCard } from "@/components/landing/FeatureCard";

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Why choose AdmissionsAI
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={CheckCircle}
            title="Trustworthy Answers"
            description="Powered by strict RAG ingestion. Every answer cites official MoET and university admission documents."
          />
          <FeatureCard
            icon={BarChart3}
            title="Smart Probability"
            description="Historical percentile matching algorithm categorizes your chances into Safety, Target, or Reach tiers."
          />
          <FeatureCard
            icon={Kanban}
            title="Kanban Roadmap"
            description="AI-suggested milestones organized in a drag-and-drop board to track your preparation journey."
          />
        </div>
      </div>
    </section>
  );
}