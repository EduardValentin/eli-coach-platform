import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-secondary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
