import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  /** Extra classes applied to the inner card wrapper */
  innerClassName?: string;
}

/**
 * Reusable bordered card container adapted from FastGPT's PageContainer.
 *
 * Renders a full-height outer wrapper with responsive padding, and an inner
 * card with rounded corners, border, shadow, and optional loading overlay.
 *
 * FastGPT source: FastGPT-reference/components/PageContainer/index.tsx
 */
export function PageContainer({
  children,
  isLoading = false,
  className,
  innerClassName,
}: PageContainerProps) {
  return (
    <div className={cn("h-full py-0 md:py-4 pr-0 md:pr-4", className)}>
      <div
        className={cn(
          "relative h-full overflow-x-hidden rounded-none border-0 md:rounded-2xl md:border shadow-sm bg-card",
          innerClassName,
        )}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/60" />
              </span>
              Loading...
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}