import { useId, type ReactNode } from "react";

import { cn, EYEBROW_CLASS } from "~/shared/design-system/lib";

export const GROUP_BRACKET_CLASS = "border-l-2 border-text-primary";

type SupersetGroupProps = { action?: ReactNode; children: ReactNode };

export function SupersetGroup({ action, children }: SupersetGroupProps) {
  const labelId = useId();

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p id={labelId} className={EYEBROW_CLASS}>
          Superset
        </p>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <ol
        aria-labelledby={labelId}
        className={cn(
          GROUP_BRACKET_CLASS,
          "grid gap-2 pl-3 @3xl:pl-5 [&>li+li]:border-t [&>li+li]:border-border-subtle [&>li+li]:pt-3",
        )}
      >
        {children}
      </ol>
    </div>
  );
}
