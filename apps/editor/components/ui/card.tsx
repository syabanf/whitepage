import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-border bg-bg p-6 transition-colors hover:border-border-emphasis",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
