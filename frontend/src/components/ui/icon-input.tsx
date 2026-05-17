import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered inside the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon rendered inside the right side of the input */
  rightIcon?: React.ReactNode;
  /** Additional classes for the outer wrapper */
  wrapperClassName?: string;
}

/**
 * Input with optional left and/or right icon slots, adapted from
 * FastGPT's MyInput component.
 *
 * FastGPT source: FastGPT-reference/components/MyInput/index.tsx
 */
export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  ({ leftIcon, rightIcon, className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", wrapperClassName)}>
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 z-10 flex h-5 w-5 items-center justify-center text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 z-10 flex h-5 w-5 items-center justify-center text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </div>
    );
  },
);

IconInput.displayName = "IconInput";