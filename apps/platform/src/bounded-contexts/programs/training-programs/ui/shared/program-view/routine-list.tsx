import { useId, type ReactNode } from "react";

import { EYEBROW_CLASS } from "~/shared/design-system/lib";

export type RoutineAmountText = { value: string; unit: string };

type EditableRoutineProps = {
  title: string;
  action: ReactNode;
  children: ReactNode;
};

export function EditableRoutine({
  title,
  action,
  children,
}: EditableRoutineProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <div className="grid gap-1">
        <div className="flex min-h-8 items-center justify-between gap-4">
          <h4 id={headingId} className={EYEBROW_CLASS}>
            {title}
          </h4>
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}
