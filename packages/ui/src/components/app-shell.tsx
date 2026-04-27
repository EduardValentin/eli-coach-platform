import type { PropsWithChildren, ReactNode } from "react";

import { Card } from "./card";

export type AppShellProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function AppShell(props: AppShellProps) {
  const { eyebrow, title, description, footer, children } = props;

  return (
    <div className="mx-auto grid w-full max-w-content gap-12 rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft sm:p-8">
      <header className="grid gap-3">
        {eyebrow ? <p className="text-label font-semibold uppercase text-brand-primary">{eyebrow}</p> : null}
        <h1 className="max-w-reading font-heading text-display-lg text-text-primary">{title}</h1>
        <p className="max-w-reading text-body-lg text-text-secondary">{description}</p>
      </header>
      <div className="grid gap-6">{children}</div>
      {footer ? <footer className="text-body-base text-text-secondary">{footer}</footer> : null}
    </div>
  );
}

export type PanelProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function Panel(props: PanelProps) {
  const { title, description, children } = props;

  return (
    <Card className="grid gap-3">
      <div className="grid gap-2">
        <h2 className="font-heading text-display-md text-text-primary">{title}</h2>
        <p className="text-body-base text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-2.5">{children}</div>
    </Card>
  );
}
