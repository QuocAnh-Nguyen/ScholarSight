import { MockupWindow } from "@/components/landing/MockupWindow";

export function ShowcaseSection() {
  return (
    <section className="py-28 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground">
          Intelligent Guidance — Answers you can trust
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          See how AdmissionsAI combines RAG-powered accuracy with smart
          probability analytics.
        </p>
        <div className="mt-14">
          <MockupWindow />
        </div>
      </div>
    </section>
  );
}