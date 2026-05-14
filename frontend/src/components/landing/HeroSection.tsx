import { AuthCard } from "@/components/landing/AuthCard";

interface HeroSectionProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  authFailed: boolean;
  submitting: boolean;
}

export function HeroSection({
  onLogin,
  onRegister,
  authFailed,
  submitting,
}: HeroSectionProps) {
  return (
    <section className="py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left column — typography & value proposition */}
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
              Your AI-Powered Path
              <br />
              to the Right University.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Accurate Data &middot; Smart Probability &middot; Actionable
              Roadmaps.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-md">
              Get instant, citation-backed answers about university admissions,
              assess your chances with percentile matching, and follow a
              personalized Kanban roadmap — all powered by AI.
            </p>
          </div>

          {/* Right column — Auth card */}
          <div className="flex justify-center lg:justify-end">
            <AuthCard
              onLogin={onLogin}
              onRegister={onRegister}
              failed={authFailed}
              submitting={submitting}
            />
          </div>
        </div>
      </div>
    </section>
  );
}