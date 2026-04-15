import type { PropsWithChildren, ReactNode } from "react";

import { Card } from "./card";
import { Link } from "./link";

type NavigationLink = {
  href: string;
  label: string;
};

export type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  links: readonly NavigationLink[];
  footer?: ReactNode;
}>;

type AppShellNavProps = {
  links: readonly NavigationLink[];
};

function AppShellNav(props: AppShellNavProps) {
  const { links } = props;

  return (
    <nav className="flex flex-wrap gap-3">
      {links.map((link) => (
        <Link key={link.href} to={link.href} variant="pill">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell(props: AppShellProps) {
  const { eyebrow, title, description, links, footer, children } = props;

  return (
    <div className="mx-auto grid max-w-content gap-8 px-5 py-12 sm:px-6 lg:gap-10 lg:px-8 lg:py-10">
      <header className="grid gap-4">
        <p className="text-label font-semibold uppercase text-brand-primary">{eyebrow}</p>
        <h1 className="max-w-reading font-heading text-display-lg text-text-primary">{title}</h1>
        <p className="max-w-reading text-body-lg text-text-secondary">{description}</p>
        <AppShellNav links={links} />
      </header>
      <main className="grid gap-6">{children}</main>
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
    <Card className="grid gap-4">
      <div className="grid gap-2">
        <h2 className="font-heading text-display-md text-text-primary">{title}</h2>
        <p className="text-body-base text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}
