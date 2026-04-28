import type { PropsWithChildren } from "react";

import { MAIN_CONTENT_ID } from "../constants";
import { Link } from "./link";

type NavigationLink = {
  href: string;
  label: string;
};

type SidebarSurfaceLayoutProps = PropsWithChildren<{
  asideLabel: string;
  links: readonly NavigationLink[];
  navigationLabel: string;
  title: string;
}>;

export function SidebarSurfaceLayout(props: SidebarSurfaceLayoutProps) {
  const { asideLabel, children, links, navigationLabel, title } = props;

  return (
    <div className="min-h-screen bg-surface-page">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <div className="mx-auto grid max-w-stage gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-12 lg:py-12">
        <aside
          aria-label={asideLabel}
          className="h-fit rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft lg:sticky lg:top-6"
        >
          <div className="grid gap-6">
            <p className="font-heading text-display-sm text-text-primary">{title}</p>
            <nav aria-label={navigationLabel} className="grid gap-2.5">
              {links.map((link) => (
                <Link key={link.href} to={link.href} variant="pill">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <main id={MAIN_CONTENT_ID} className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
