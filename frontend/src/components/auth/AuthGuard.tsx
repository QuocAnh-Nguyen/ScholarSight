import { useAuth } from "@/providers/AuthProvider";
import type { ReactNode } from "react";

/** Wraps protected views. Renders nothing if not authenticated (parent App.tsx shows auth view). */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/60" />
            </span>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}