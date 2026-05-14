import { Github, Twitter, Mail } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          &copy; 2026 AdmissionsAI Platform
        </p>
        <div className="flex items-center gap-5">
          <a
            href="mailto:contact@admissionsai.com"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Contact"
          >
            <Mail className="h-4 w-4" />
          </a>
          <a
            href="https://github.com"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://twitter.com"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Twitter (X)"
          >
            <Twitter className="h-4 w-4" />
          </a>
           <a
            href="mailto:support@admissionsai.com"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Support Email"
          >
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}