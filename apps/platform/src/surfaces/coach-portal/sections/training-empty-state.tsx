import type { ReactNode } from "react";

export function TrainingEmptyState(props: { icon: ReactNode; message: string }) {
  return (
    <section className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto mb-3 block w-fit text-text-muted">
        {props.icon}
      </span>
      <p className="text-body-sm text-text-secondary">{props.message}</p>
    </section>
  );
}
