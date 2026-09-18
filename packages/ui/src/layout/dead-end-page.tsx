import type { ReactNode } from "react";

import { SectionEyebrow } from "../primitives";

export const DEAD_END_ACTION_CLASS_NAME =
  "mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary";

type DeadEndPageProps = {
  children: ReactNode;
  description: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  label: string;
  title: string;
};

export function DeadEndPage(props: DeadEndPageProps) {
  const { children, description, eyebrow, icon, label, title } = props;

  return (
    <main
      aria-label={label}
      className="flex min-h-screen w-full flex-col items-center justify-center bg-surface-page px-6 py-16 text-center"
    >
      <div className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        {icon}
      </div>
      <SectionEyebrow variant="muted">{eyebrow}</SectionEyebrow>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-lg leading-copy-relaxed text-text-secondary">
        {description}
      </p>
      {children}
    </main>
  );
}
