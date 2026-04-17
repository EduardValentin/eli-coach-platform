import type { PropsWithChildren } from "react";

import { MAIN_CONTENT_ID, SurfaceNavigation, type NavigationLink } from "./surface-layout.shared";

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
      <div className="mx-auto grid max-w-stage gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside
          aria-label={asideLabel}
          className="h-fit rounded-panel border border-border-subtle bg-surface-base p-6 shadow-soft lg:sticky lg:top-6"
        >
          <div className="grid gap-6">
            <p className="font-heading text-display-sm text-text-primary">{title}</p>
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
