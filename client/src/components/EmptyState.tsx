// client/src/components/EmptyState.tsx
// Reusable empty / zero-results state panel.

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="text-5xl" aria-hidden>
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
