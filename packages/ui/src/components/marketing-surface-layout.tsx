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
      <div className="mx-auto grid max-w-stage gap-12 px-4 py-6 sm:px-6 lg:px-12 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft sm:p-8">
          <p className="font-heading text-display-sm text-text-primary">{title}</p>
          <nav aria-label={navigationLabel} className="flex flex-wrap gap-2.5">
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
