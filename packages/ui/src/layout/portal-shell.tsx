import { ChevronRight, Ellipsis, Menu, X, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import { Link as RouterLink, useLocation } from "react-router";

import { MAIN_CONTENT_ID } from "../lib/constants";
import { cn } from "../lib/cn";
import { focusMainContent } from "../lib/focus-main-content";
import { buttonVariants } from "../primitives/button";
import { BottomSheet } from "./bottom-sheet";
import { NavigationDialog } from "./navigation-dialog";
import { useCloseMobileNavigationOnDesktop } from "./use-close-mobile-navigation-on-desktop";

export type PortalNavigationLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  marked?: boolean;
};

type PortalMoreSheetContent = {
  footer: ReactNode;
  navigationLabel: string;
  renderHeader: (closeSheet: () => void) => ReactNode;
  title: string;
};

type PortalMobileNavigation =
  | { kind: "drawer"; label: string }
  | {
      kind: "tabs";
      sheet: PortalMoreSheetContent;
      tabs: readonly PortalNavigationLink[];
      tabsLabel: string;
    };

type PortalShellProps = PropsWithChildren<{
  asideLabel: string;
  brand: ReactNode;
  links: readonly PortalNavigationLink[];
  mobileNavigation: PortalMobileNavigation;
  navigationLabel: string;
  /** Slot beside the sidebar brand for the notification bell story. */
  sidebarActions?: ReactNode;
  topBarBrand: ReactNode;
  /** Top bar slot for the notification bell story. */
  topBarActions?: ReactNode;
  topBarLabel: string;
}>;

type PortalTopBarContent = {
  actions?: ReactNode;
  brand: ReactNode;
  label: string;
};

type MoreSheetState = "open" | "closed" | "closed-for-desktop";

type NavigationItemState = "current" | "idle";

const MAX_BAR_TABS = 4;
const TAB_ATTENTION_DOT_CLASS_NAME =
  "absolute -top-0.5 -right-0.5 ring-2 ring-surface-base";
const MORE_SHEET_ID = "portal-more-sheet";
const TAB_CLASS_NAME =
  "flex h-full w-full flex-col items-center justify-center gap-1 transition-colors";
const NAVIGATION_ITEM_CLASS_NAMES: Record<NavigationItemState, string> = {
  current: "bg-primary-soft text-primary",
  idle: "text-text-secondary hover:bg-primary-soft hover:text-primary",
};
const SHEET_LINK_CLASS_NAMES: Record<NavigationItemState, string> = {
  current: "bg-primary-soft text-primary",
  idle: "text-text-primary hover:bg-primary-soft hover:text-primary",
};
const MOBILE_ICON_STROKE_WIDTHS: Record<NavigationItemState, number> = {
  current: 2.4,
  idle: 2,
};
const SIDEBAR_ICON_STROKE_WIDTHS: Record<NavigationItemState, number> = {
  current: 2.5,
  idle: 2,
};

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
    mobileNavigation,
    navigationLabel,
    sidebarActions,
    topBarActions,
    topBarBrand,
    topBarLabel,
  } = props;
  const topBar: PortalTopBarContent = {
    actions: topBarActions,
    brand: topBarBrand,
    label: topBarLabel,
  };

  return (
    <div className="min-h-dvh bg-surface-page" data-parity-root="PortalShell">
      <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      {mobileNavigation.kind === "drawer" ? (
        <PortalDrawerNavigation
          label={mobileNavigation.label}
          links={links}
          navigationLabel={navigationLabel}
          topBar={topBar}
        />
      ) : (
        <PortalTabNavigation
          links={links}
          tabNavigation={mobileNavigation}
          topBar={topBar}
        />
      )}
      <aside
        aria-label={asideLabel}
        className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-surface-base lg:block"
      >
        <PortalSidebarSurface>
          <div
            className="mb-4 flex items-center justify-between rounded-field border-b border-stroke-quiet px-3 py-6"
            data-parity="sidebar-header"
          >
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
        className={cn(
          "min-w-0 pt-[calc(env(safe-area-inset-top)+4rem)] lg:pt-0 lg:pl-64",
          {
            "pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-0":
              mobileNavigation.kind === "tabs",
          },
        )}
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
      >
        <div className="mx-auto max-w-portal px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

type PortalTopBarProps = PropsWithChildren<{
  brand: ReactNode;
  label: string;
}>;

function PortalTopBar(props: PortalTopBarProps) {
  const { brand, children, label } = props;

  return (
    <header
      aria-label={label}
      className="fixed inset-x-0 top-0 z-50 flex h-[calc(env(safe-area-inset-top)+4rem)] items-center justify-between rounded-field border-b border-border-subtle bg-surface-base px-6 pt-[env(safe-area-inset-top)] text-text-primary shadow-card lg:hidden"
    >
      <div className="flex min-w-0 items-center gap-3">{brand}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

type PortalDrawerNavigationProps = {
  label: string;
  links: readonly PortalNavigationLink[];
  navigationLabel: string;
  topBar: PortalTopBarContent;
};

function PortalDrawerNavigation(props: PortalDrawerNavigationProps) {
  const { label, links, navigationLabel, topBar } = props;

  return (
    <NavigationDialog
      closeMenuIcon={<X aria-hidden="true" className="size-6" />}
      contentClassName="fixed inset-0 z-40 outline-none lg:hidden"
      menuButtonClassName={buttonVariants({
        className: "relative z-[60] -mr-2",
        size: "icon-sm",
        variant: "ghost-muted",
      })}
      openMenuIcon={<Menu aria-hidden="true" className="size-6" />}
      renderTopBar={(dialogTopBar) => (
        <PortalTopBar brand={topBar.brand} label={topBar.label}>
          {dialogTopBar.actions}
          {dialogTopBar.menuButton}
        </PortalTopBar>
      )}
      title={label}
      topBarActions={topBar.actions}
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
  );
}

type PortalTabNavigationProps = {
  links: readonly PortalNavigationLink[];
  tabNavigation: Extract<PortalMobileNavigation, { kind: "tabs" }>;
  topBar: PortalTopBarContent;
};

function PortalTabNavigation(props: PortalTabNavigationProps) {
  const { links, tabNavigation, topBar } = props;
  const { sheet, tabs, tabsLabel } = tabNavigation;
  const [moreSheet, setMoreSheet] = useState<MoreSheetState>("closed");
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const barTabs = tabs.slice(0, MAX_BAR_TABS);
  const sheetLinks = links.filter(
    (link) => !barTabs.some((tab) => tab.href === link.href),
  );
  const activeHref = useActiveHref([...barTabs, ...sheetLinks]);
  const isMoreOpen = moreSheet === "open";
  const moreState: NavigationItemState =
    isMoreOpen || sheetLinks.some((link) => link.href === activeHref)
      ? "current"
      : "idle";
  const isMoreMarked = sheetLinks.some((link) => link.marked);

  const closeMoreForDesktop = useCallback(() => {
    setMoreSheet("closed-for-desktop");
  }, []);

  useCloseMobileNavigationOnDesktop({
    close: closeMoreForDesktop,
    isOpen: isMoreOpen,
    mobileControlRef: moreButtonRef,
  });

  useEffect(() => {
    if (moreSheet === "closed-for-desktop") {
      focusMainContent();
    }
  }, [moreSheet]);

  return (
    <>
      <PortalTopBar brand={topBar.brand} label={topBar.label}>
        {topBar.actions}
      </PortalTopBar>
      <PortalTabBar
        activeHref={activeHref}
        label={tabsLabel}
        more={{
          buttonRef: moreButtonRef,
          expanded: isMoreOpen,
          marked: isMoreMarked,
          onOpen: () => setMoreSheet("open"),
          state: moreState,
        }}
        tabs={barTabs}
      />
      <PortalMoreSheet
        activeHref={activeHref}
        content={sheet}
        links={sheetLinks}
        onOpenChange={(open) => setMoreSheet(open ? "open" : "closed")}
        open={isMoreOpen}
      />
    </>
  );
}

type PortalMoreControl = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  marked: boolean;
  onOpen: () => void;
  state: NavigationItemState;
};

type PortalTabBarProps = {
  activeHref: string | null;
  label: string;
  more: PortalMoreControl;
  tabs: readonly PortalNavigationLink[];
};

function PortalTabBar(props: PortalTabBarProps) {
  const { activeHref, label, more, tabs } = props;

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-base pb-[env(safe-area-inset-bottom)] shadow-tab-bar lg:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const state: NavigationItemState =
            tab.href === activeHref ? "current" : "idle";
          const Icon = tab.icon;

          return (
            <li className="flex-1" key={tab.href}>
              <RouterLink
                aria-current={state === "current" ? "page" : undefined}
                className={cn(
                  TAB_CLASS_NAME,
                  NAVIGATION_ITEM_CLASS_NAMES[state],
                )}
                data-parity={`tab-${parityHookSlug(tab.label)}`}
                to={tab.href}
              >
                <TabIcon>
                  <Icon
                    aria-hidden="true"
                    size={22}
                    strokeWidth={MOBILE_ICON_STROKE_WIDTHS[state]}
                  />
                  {tab.marked && (
                    <AttentionDot className={TAB_ATTENTION_DOT_CLASS_NAME} />
                  )}
                </TabIcon>
                <span className="text-caption font-semibold">{tab.label}</span>
                {tab.marked && <NewMarkLabel />}
              </RouterLink>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            aria-controls={MORE_SHEET_ID}
            aria-expanded={more.expanded}
            className={cn(
              TAB_CLASS_NAME,
              NAVIGATION_ITEM_CLASS_NAMES[more.state],
            )}
            data-parity="tab-more"
            onClick={more.onOpen}
            ref={more.buttonRef}
            type="button"
          >
            <TabIcon>
              <Ellipsis
                aria-hidden="true"
                size={22}
                strokeWidth={MOBILE_ICON_STROKE_WIDTHS[more.state]}
              />
              {more.marked && (
                <AttentionDot className={TAB_ATTENTION_DOT_CLASS_NAME} />
              )}
            </TabIcon>
            <span className="text-caption font-semibold">More</span>
            {more.marked && <NewMarkLabel />}
          </button>
        </li>
      </ul>
    </nav>
  );
}

type PortalMoreSheetProps = {
  activeHref: string | null;
  content: PortalMoreSheetContent;
  links: readonly PortalNavigationLink[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function PortalMoreSheet(props: PortalMoreSheetProps) {
  const { activeHref, content, links, onOpenChange, open } = props;
  const closeSheet = () => onOpenChange(false);

  return (
    <BottomSheet
      className="flex h-[90vh] flex-col"
      id={MORE_SHEET_ID}
      onOpenChange={onOpenChange}
      open={open}
      title={content.title}
    >
      <div className="flex h-full flex-col">
        <div
          className="rounded-field border-b border-border-subtle px-5 pt-6 pb-4"
          data-parity="sheet-name-block"
        >
          {content.renderHeader(closeSheet)}
        </div>
        {links.length > 0 && (
          <PortalSheetNavigation
            activeHref={activeHref}
            links={links}
            navigationLabel={content.navigationLabel}
            onNavigate={closeSheet}
          />
        )}
        <div className="mt-auto border-t border-border-subtle px-4 py-3">
          {content.footer}
        </div>
      </div>
    </BottomSheet>
  );
}

type PortalSheetNavigationProps = {
  activeHref: string | null;
  links: readonly PortalNavigationLink[];
  navigationLabel: string;
  onNavigate: () => void;
};

function PortalSheetNavigation(props: PortalSheetNavigationProps) {
  const { activeHref, links, navigationLabel, onNavigate } = props;

  return (
    <nav
      aria-label={navigationLabel}
      data-parity="more-navigation"
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
    >
      {links.map((link) => {
        const state: NavigationItemState =
          link.href === activeHref ? "current" : "idle";
        const Icon = link.icon;

        return (
          <RouterLink
            aria-current={state === "current" ? "page" : undefined}
            className={cn(
              "flex min-h-14 items-center gap-4 rounded-card px-4 transition-colors",
              SHEET_LINK_CLASS_NAMES[state],
            )}
            data-parity={`sheet-link-${parityHookSlug(link.label)}`}
            key={link.href}
            onClick={onNavigate}
            to={link.href}
          >
            <Icon
              aria-hidden="true"
              size={22}
              strokeWidth={MOBILE_ICON_STROKE_WIDTHS[state]}
            />
            <span className="flex-1 text-base font-medium">{link.label}</span>
            {link.marked && (
              <>
                <NewMarkLabel />
                <AttentionDot />
              </>
            )}
            <ChevronRight
              aria-hidden="true"
              className="text-text-secondary"
              size={18}
            />
          </RouterLink>
        );
      })}
    </nav>
  );
}

function TabIcon(props: PropsWithChildren) {
  const { children } = props;

  return <span className="relative inline-flex">{children}</span>;
}

type AttentionDotProps = {
  className?: string;
};

function AttentionDot(props: AttentionDotProps) {
  const { className } = props;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-2 shrink-0 rounded-full bg-status-pending",
        className,
      )}
      data-parity="attention-dot"
    />
  );
}

function NewMarkLabel() {
  return <span className="sr-only"> (new)</span>;
}

function parityHookSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function useActiveHref(links: readonly PortalNavigationLink[]) {
  const { pathname } = useLocation();

  const matches = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // The longest matching href wins, so a portal-root link stays inactive on
  // nested paths without special-casing the root.
  return links
    .filter((link) => matches(link.href))
    .reduce<string | null>(
      (longest, link) =>
        longest === null || link.href.length > longest.length
          ? link.href
          : longest,
      null,
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
  const activeHref = useActiveHref(links);

  return (
    <nav
      aria-label={navigationLabel}
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2"
    >
      {links.map((link, linkIndex) => {
        const state: NavigationItemState =
          link.href === activeHref ? "current" : "idle";
        const Icon = link.icon;

        return (
          <RouterLink
            aria-current={state === "current" ? "page" : undefined}
            className={cn(
              "flex items-center gap-4 rounded-card px-4 py-3.5 transition-all",
              NAVIGATION_ITEM_CLASS_NAMES[state],
            )}
            data-parity={`link-${parityHookSlug(link.label)}`}
            key={link.href}
            onClick={onNavigate}
            ref={linkIndex === 0 ? firstLinkRef : undefined}
            to={link.href}
          >
            <Icon
              aria-hidden="true"
              size={18}
              strokeWidth={SIDEBAR_ICON_STROKE_WIDTHS[state]}
            />
            <span className="text-sm font-medium">{link.label}</span>
            {link.marked && (
              <>
                <NewMarkLabel />
                <AttentionDot className="ml-auto" />
              </>
            )}
          </RouterLink>
        );
      })}
    </nav>
  );
}
