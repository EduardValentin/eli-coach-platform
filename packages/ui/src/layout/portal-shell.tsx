import { Menu, X, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { PropsWithChildren, ReactNode, RefObject } from "react";
import { Link as RouterLink, useLocation } from "react-router";

import { MAIN_CONTENT_ID } from "../lib/constants";
import { cn } from "../lib/cn";
import { NavigationDialog } from "./navigation-dialog";

export type PortalNavigationLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Slot after the label for a count badge once a story ships one. */
  trailing?: ReactNode;
};

type PortalShellProps = PropsWithChildren<{
  asideLabel: string;
  /** Sidebar brand block; non-navigating until a profile page exists. */
  brand: ReactNode;
  links: readonly PortalNavigationLink[];
  mobileNavigationLabel: string;
  navigationLabel: string;
  /** Slot beside the sidebar brand for the notification bell story. */
  sidebarActions?: ReactNode;
  topBarBrand: ReactNode;
  /** Slot before the menu toggle for the notification bell story. */
  topBarActions?: ReactNode;
}>;

const BACKDROP_VARIANTS = {
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
} as const;
const DRAWER_VARIANTS = {
  closed: {
    transition: { damping: 25, stiffness: 200, type: "spring" },
    x: "-100%",
  },
  open: { transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }, x: 0 },
} as const;

export function PortalShell(props: PortalShellProps) {
  const {
    asideLabel,
    brand,
    children,
    links,
    mobileNavigationLabel,
    navigationLabel,
    sidebarActions,
    topBarActions,
    topBarBrand,
  } = props;

  return (
    <div className="min-h-dvh bg-surface-page" data-parity-root="PortalShell">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <NavigationDialog
        closeMenuIcon={<X aria-hidden="true" className="size-6" />}
        contentClassName="fixed inset-0 z-40 outline-none lg:hidden"
        menuButtonClassName="relative z-[60] -mr-2 text-text-secondary hover:text-text-primary"
        openMenuIcon={<Menu aria-hidden="true" className="size-6" />}
        renderTopBar={(topBar) => (
          <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border-subtle bg-surface-base px-6 shadow-soft lg:hidden">
            <div className="flex min-w-0 items-center gap-3">{topBarBrand}</div>
            <div className="flex items-center gap-2">
              {topBar.actions}
              {topBar.menuButton}
            </div>
          </header>
        )}
        title={mobileNavigationLabel}
        topBarActions={topBarActions}
      >
        {(menu) => (
          <PortalMobileDrawer>
            <PortalSidebarSurface>
              <PortalSidebarNavigation
                firstLinkRef={menu.firstLinkRef}
                links={links}
                navigationLabel={navigationLabel}
                onNavigate={menu.close}
              />
            </PortalSidebarSurface>
          </PortalMobileDrawer>
        )}
      </NavigationDialog>
      <aside
        aria-label={asideLabel}
        className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"
      >
        <PortalSidebarSurface>
          <div className="mb-4 flex items-center justify-between rounded-field border-b border-stroke-quiet px-3 py-6">
            {brand}
            {sidebarActions}
          </div>
          <PortalSidebarNavigation
            links={links}
            navigationLabel={navigationLabel}
          />
        </PortalSidebarSurface>
      </aside>
      <main
        className="min-w-0 pt-16 lg:pl-64 lg:pt-0"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        <div className="mx-auto max-w-portal p-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function PortalMobileDrawer(props: PropsWithChildren) {
  const { children } = props;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-overlay-soft backdrop-blur-sm"
        variants={BACKDROP_VARIANTS}
      />
      <motion.div
        className="absolute bottom-0 left-0 top-16 w-64 shadow-floating"
        data-parity-root="PortalMobileDrawer"
        variants={DRAWER_VARIANTS}
      >
        {children}
      </motion.div>
    </>
  );
}

function PortalSidebarSurface(props: PropsWithChildren) {
  const { children } = props;

  return (
    <div className="flex h-full flex-col border-r border-stroke-faint bg-surface-base text-text-primary">
      {children}
    </div>
  );
}

type PortalSidebarNavigationProps = {
  firstLinkRef?: RefObject<HTMLAnchorElement | null>;
  links: readonly PortalNavigationLink[];
  navigationLabel: string;
  onNavigate?: () => void;
};

function PortalSidebarNavigation(props: PortalSidebarNavigationProps) {
  const { firstLinkRef, links, navigationLabel, onNavigate } = props;
  const { pathname } = useLocation();

  const matches = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // The longest matching href wins, so a portal-root link stays inactive on
  // nested paths without special-casing the root.
  const activeHref = links
    .filter((link) => matches(link.href))
    .reduce<string | null>(
      (longest, link) =>
        longest === null || link.href.length > longest.length
          ? link.href
          : longest,
      null,
    );

  return (
    <nav
      aria-label={navigationLabel}
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2"
    >
      {links.map((link, linkIndex) => {
        const isActive = link.href === activeHref;
        const Icon = link.icon;

        return (
          <RouterLink
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-4 rounded-card px-4 py-3.5 transition-all",
              {
                "bg-primary-soft text-primary": isActive,
                "text-text-secondary hover:bg-primary-soft hover:text-primary":
                  !isActive,
              },
            )}
            key={link.href}
            onClick={onNavigate}
            ref={linkIndex === 0 ? firstLinkRef : undefined}
            to={link.href}
          >
            <Icon
              aria-hidden="true"
              size={18}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className="text-sm font-medium">{link.label}</span>
            {link.trailing}
          </RouterLink>
        );
      })}
    </nav>
  );
}
