import type { PropsWithChildren } from "react";

import { MAIN_CONTENT_ID } from "./accessibility-manager";
import { Link } from "./link";

type NavigationLink = {
  href: string;
  label: string;
};

type SurfaceNavigationProps = {
  className: string;
  links: readonly NavigationLink[];
  navigationLabel: string;
};

type MarketingSurfaceLayoutProps = PropsWithChildren<{
  description: string;
  eyebrow: string;
  links: readonly NavigationLink[];
  navigationLabel: string;
  title: string;
}>;

type SidebarSurfaceLayoutProps = PropsWithChildren<{
  asideLabel: string;
  description: string;
  eyebrow: string;
  links: readonly NavigationLink[];
  navigationLabel: string;
  title: string;
}>;

function SurfaceNavigation(props: SurfaceNavigationProps) {
  const { className, links, navigationLabel } = props;

  return (
    <nav aria-label={navigationLabel} className={className}>
      {links.map((link) => (
        <Link key={link.href} to={link.href} variant="pill">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function MarketingSurfaceLayout(props: MarketingSurfaceLayoutProps) {
  const { children, description, eyebrow, links, navigationLabel, title } = props;

  return (
    <div className="min-h-screen bg-surface-page">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <div className="mx-auto grid max-w-stage gap-8 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="grid gap-5 rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft sm:p-7">
          <div className="grid gap-3">
            <p className="text-label font-semibold uppercase text-brand-primary">{eyebrow}</p>
            <p className="font-heading text-display-sm text-text-primary">{title}</p>
            <p className="max-w-reading text-body-base text-text-secondary">{description}</p>
          </div>
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

export function SidebarSurfaceLayout(props: SidebarSurfaceLayoutProps) {
  const { asideLabel, children, description, eyebrow, links, navigationLabel, title } = props;

  return (
    <div className="min-h-screen bg-surface-page">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <div className="mx-auto grid max-w-stage gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside
          aria-label={asideLabel}
          className="h-fit rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft lg:sticky lg:top-6"
        >
          <div className="grid gap-6">
            <div className="grid gap-3">
              <p className="text-label font-semibold uppercase text-brand-primary">{eyebrow}</p>
              <p className="font-heading text-display-sm text-text-primary">{title}</p>
              <p className="text-body-base text-text-secondary">{description}</p>
            </div>
            <SurfaceNavigation
              className="grid gap-3"
              links={links}
              navigationLabel={navigationLabel}
            />
          </div>
        </aside>
        <main id={MAIN_CONTENT_ID} className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
