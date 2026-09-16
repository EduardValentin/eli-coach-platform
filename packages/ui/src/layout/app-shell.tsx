import type { PropsWithChildren, ReactNode } from "react";

type AppShellProps = PropsWithChildren<{
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
