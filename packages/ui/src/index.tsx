import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router";

type NavigationLink = {
  href: string;
  label: string;
};

type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  links: readonly NavigationLink[];
  footer?: ReactNode;
}>;

export function AppShell(props: AppShellProps) {
  const { eyebrow, title, description, links, footer, children } = props;

  return (
    <div className="mx-auto grid max-w-content gap-8 px-5 py-12 sm:px-6 lg:gap-10 lg:px-8 lg:py-10">
      <header className="grid gap-4">
        <p className="text-label font-semibold uppercase text-brand-primary">{eyebrow}</p>
        <h1 className="max-w-reading font-heading text-display-xl text-text-primary">{title}</h1>
        <p className="max-w-reading text-body-lg text-text-secondary">{description}</p>
        <nav className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-pill border border-border-subtle bg-surface-base/80 px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="grid gap-6">{children}</main>
      {footer ? <footer className="text-body-base text-text-secondary">{footer}</footer> : null}
    </div>
  );
}

type PanelProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function Panel(props: PanelProps) {
  const { title, description, children } = props;

  return (
    <section className="grid gap-4 rounded-panel border border-border-subtle bg-surface-base px-6 py-6 shadow-soft sm:px-7">
      <div className="grid gap-2">
        <h2 className="font-heading text-display-md text-text-primary">{title}</h2>
        <p className="text-body-base text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

export function Badge(props: PropsWithChildren) {
  return (
    <span className="inline-flex items-center rounded-pill border border-brand-primary/15 bg-brand-primary/10 px-3 py-1.5 text-label font-semibold uppercase text-text-primary">
      {props.children}
    </span>
  );
}
