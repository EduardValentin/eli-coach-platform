import type { PropsWithChildren } from "react";

import { MAIN_CONTENT_ID } from "../constants";
import { Link } from "./link";

type NavigationLink = {
  href: string;
  label: string;
};

type MarketingSurfaceLayoutProps = PropsWithChildren<{
  links: readonly NavigationLink[];
  navigationLabel: string;
  title: string;
}>;

export function MarketingSurfaceLayout(props: MarketingSurfaceLayoutProps) {
  const { children, links, navigationLabel, title } = props;

  return (
    <div className="min-h-screen bg-surface-page">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <div className="mx-auto grid max-w-stage gap-[var(--space-8)] px-[var(--space-5)] py-[var(--space-6)] sm:px-[var(--space-6)] lg:px-[var(--space-8)] lg:py-[var(--space-8)]">
        <header className="flex flex-wrap items-center justify-between gap-[var(--space-4)] rounded-panel border border-border-subtle bg-surface-base p-[var(--space-6)] shadow-soft sm:p-[var(--space-7)]">
          <p className="font-heading text-display-sm text-text-primary">{title}</p>
          <nav aria-label={navigationLabel} className="flex flex-wrap gap-[var(--space-3)]">
            {links.map((link) => (
              <Link key={link.href} to={link.href} variant="pill">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main id={MAIN_CONTENT_ID} className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
