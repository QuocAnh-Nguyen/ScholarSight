import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FooterSection } from "@/components/landing/FooterSection";

interface LandingPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  authFailed: boolean;
  submitting: boolean;
}

export function LandingPage({
  onLogin,
  onRegister,
  authFailed,
  submitting,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background overflow-auto">
      <LandingNav />
      <HeroSection
        onLogin={onLogin}
        onRegister={onRegister}
        authFailed={authFailed}
        submitting={submitting}
      />
      <ShowcaseSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}