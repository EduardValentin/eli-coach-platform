import type { PropsWithChildren } from "react";

import { MAIN_CONTENT_ID, SurfaceNavigation, type NavigationLink } from "./surface-layout.shared";

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
      <div className="mx-auto grid max-w-stage gap-8 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft sm:p-7">
          <p className="font-heading text-display-sm text-text-primary">{title}</p>
          <SurfaceNavigation
            className="flex flex-wrap gap-3"
            links={links}
            navigationLabel={navigationLabel}
          />
        </header>
        <main id={MAIN_CONTENT_ID} className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
