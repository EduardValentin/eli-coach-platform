import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Link as RouterLink, useLocation } from "react-router";

import { MAIN_CONTENT_ID } from "../constants";
import { cn } from "../lib/cn";
import { IconButton } from "./icon-button";
import { ToastRegion } from "./toaster";

export type PortalNavigationLink = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Slot after the label for a count badge once a story ships one. */
  trailing?: ReactNode;
};

export type PortalShellProps = PropsWithChildren<{
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

const MENU_FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const topBarRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // The open menu covers the page, but the top bar stays above it so the
  // toggle remains reachable. Keyboard focus has to respect the same
  // boundary: the reachable set is the top bar plus the overlay, never the
  // obscured page. Radix Dialog/Sheet (used elsewhere in this package) can't
  // model this — its focus scope traps within one subtree and would inert
  // the top bar — so the trap is hand-rolled here, mirroring the
  // public-site navigation's proven implementation.
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    overlayRef.current
      ?.querySelector<HTMLElement>(MENU_FOCUSABLE_SELECTOR)
      ?.focus();

    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const reachable = [topBarRef.current, overlayRef.current]
        .filter((root): root is HTMLElement => root !== null)
        .flatMap((root) =>
          Array.from(
            root.querySelectorAll<HTMLElement>(MENU_FOCUSABLE_SELECTOR),
          ),
        )
        .filter(
          (element) =>
            !element.hasAttribute("disabled") &&
            element.getClientRects().length > 0,
        );

      if (reachable.length === 0) {
        return;
      }

      const first = reachable[0];
      const last = reachable[reachable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (
        event.shiftKey &&
        (active === first || active === null || !reachable.includes(active))
      ) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleMenuKeyDown);

    return () => {
      window.removeEventListener("keydown", handleMenuKeyDown);
      previouslyFocused?.focus();
    };
  }, [closeMenu, isMenuOpen]);

  return (
    <ToastRegion>
      <div className="min-h-dvh bg-surface-page">
        <a className="ui-skip-link" href={`#${MAIN_CONTENT_ID}`}>
          Skip to main content
        </a>
        <header
          className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-control-border-soft bg-surface-base px-6 shadow-soft lg:hidden"
          ref={topBarRef}
        >
          <div className="flex min-w-0 items-center gap-3">{topBarBrand}</div>
          <div className="flex items-center gap-2">
            {topBarActions}
            <IconButton
              aria-controls={menuId}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              className="relative z-[60] -mr-2 text-text-secondary hover:text-text-primary"
              onClick={() => {
                setIsMenuOpen((open) => !open);
              }}
            >
              {isMenuOpen ? <CloseGlyph /> : <MenuGlyph />}
            </IconButton>
          </div>
        </header>
        {isMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-overlay-soft opacity-100 backdrop-blur-sm motion-safe:transition-opacity motion-safe:duration-300 motion-safe:starting:opacity-0 lg:hidden"
            id={menuId}
            onClick={(event) => {
              // Clicks inside the drawer bubble up with their own target;
              // only a click on the backdrop itself dismisses the menu.
              if (event.target === event.currentTarget) {
                closeMenu();
              }
            }}
            ref={overlayRef}
            role="presentation"
          >
            <aside
              aria-label={mobileNavigationLabel}
              className="absolute inset-y-0 left-0 w-64 translate-x-0 shadow-floating motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:-translate-x-full"
            >
              <PortalSidebarContent
                actions={sidebarActions}
                brand={brand}
                links={links}
                navigationLabel={mobileNavigationLabel}
                onNavigate={closeMenu}
              />
            </aside>
          </div>
        ) : null}
        <aside
          aria-label={asideLabel}
          className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-surface-base lg:block"
        >
          <PortalSidebarContent
            actions={sidebarActions}
            brand={brand}
            links={links}
            navigationLabel={navigationLabel}
          />
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
    </ToastRegion>
  );
}

type PortalSidebarContentProps = {
  actions?: ReactNode;
  brand: ReactNode;
  links: readonly PortalNavigationLink[];
  navigationLabel: string;
  onNavigate?: () => void;
};

function PortalSidebarContent(props: PortalSidebarContentProps) {
  const { actions, brand, links, navigationLabel, onNavigate } = props;
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
    <div className="flex h-full flex-col border-r border-border-subtle bg-surface-base text-text-primary">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-subtle p-6">
        {brand}
        {actions}
      </div>
      <nav
        aria-label={navigationLabel}
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2"
      >
        {links.map((link) => {
          const isActive = link.href === activeHref;

          return (
            <RouterLink
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-4 rounded-md px-4 py-3.5 outline-none transition-colors duration-150 ease-out focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
                {
                  "bg-text-primary text-text-inverted shadow-portal-control": isActive,
                  "text-text-secondary hover:bg-surface-subtle hover:text-text-primary":
                    !isActive,
                },
              )}
              key={link.href}
              onClick={onNavigate}
              to={link.href}
            >
              {link.icon}
              <span className="text-body-sm font-semibold leading-5">{link.label}</span>
              {link.trailing}
            </RouterLink>
          );
        })}
      </nav>
    </div>
  );
}

function MenuGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
