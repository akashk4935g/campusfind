import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Bento layout: a dense mixed-size tile grid on desktop that collapses to a
 * single column on mobile. Children control their own span via ItemCard size.
 */
export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Distributes bento sizes so the grid feels composed rather than uniform. */
export function bentoSize(index: number): "standard" | "wide" | "tall" {
  return index % 5 === 0 ? "wide" : "standard";
}

