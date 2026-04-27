import { Menu, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import type { PublicLaunchMode } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

const SCROLLED_NAV_THRESHOLD = 50;
const MOBILE_MENU_EXIT_DURATION_MS = 300;

export type PublicNavigationScrollBehavior = "hero-overlay" | "solid";

type PublicNavigationLink = {
  href: string;
  label: string;
};

type PublicNavigationProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
  scrollBehavior: PublicNavigationScrollBehavior;
  variant: PublicLaunchMode;
};

export function PublicNavigation(props: PublicNavigationProps) {
  const { actions, links, scrollBehavior } = props;
  const [isScrolled, setIsScrolled] = useState(scrollBehavior === "solid");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearMobileMenuCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const openMobileMenu = useCallback(() => {
    clearMobileMenuCloseTimeout();
    setIsMobileMenuClosing(false);
    setIsMobileMenuOpen(true);
  }, [clearMobileMenuCloseTimeout]);

  const closeMobileMenu = useCallback(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    clearMobileMenuCloseTimeout();
    setIsMobileMenuOpen(false);
    setIsMobileMenuClosing(true);

    const exitDuration = resolveMobileMenuExitDuration();

    if (exitDuration === 0) {
      setIsMobileMenuClosing(false);
      return;
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsMobileMenuClosing(false);
      closeTimeoutRef.current = null;
    }, exitDuration);
  }, [clearMobileMenuCloseTimeout, isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }, [closeMobileMenu, isMobileMenuOpen, openMobileMenu]);

  useEffect(() => {
    if (scrollBehavior === "solid") {
      setIsScrolled(true);
      return;
    }

    const updateScrollState = () => {
      setIsScrolled(window.scrollY > SCROLLED_NAV_THRESHOLD);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, [scrollBehavior]);

  useEffect(() => {
    return () => {
      clearMobileMenuCloseTimeout();
    };
  }, [clearMobileMenuCloseTimeout]);

  const isMobileMenuMounted = isMobileMenuOpen || isMobileMenuClosing;

  useEffect(() => {
    if (!isMobileMenuMounted) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuMounted]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [closeMobileMenu, isMobileMenuOpen]);

  const shouldUseSolidAppearance =
    scrollBehavior === "solid" || isScrolled || isMobileMenuMounted;

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[60] transition-colors duration-300 ease-out",
          shouldUseSolidAppearance
            ? "bg-surface-base/95 text-text-primary shadow-public-nav backdrop-blur-md"
            : "bg-surface-base/0 text-text-inverted",
        )}
        data-appearance={shouldUseSolidAppearance ? "solid" : "transparent"}
      >
        <nav
          aria-label="Public site navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6"
        >
          <Link
            className="relative z-[60] inline-flex min-w-0 items-center gap-2 rounded-xs outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
            onClick={() => setIsMobileMenuOpen(false)}
            to="/"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 rotate-45 items-center justify-center rounded-xs border-2 transition-colors duration-150 ease-out",
                shouldUseSolidAppearance ? "border-brand-primary" : "border-current",
              )}
            >
              <span
                className={cn(
                  "block size-4 -rotate-45 transition-colors duration-150 ease-out",
                  shouldUseSolidAppearance ? "bg-brand-primary" : "bg-current",
                )}
              />
            </span>
            <span
              className={cn(
                "ml-2 truncate font-heading text-xl font-semibold tracking-nav transition-colors duration-150 ease-out",
                shouldUseSolidAppearance ? "text-text-primary" : "text-text-inverted",
              )}
            >
              Eli Fitness
            </span>
          </Link>

          <>
            <div className="hidden items-center gap-7 md:flex">
              {links.map((link) => (
                <Link
                  className="text-sm font-medium tracking-nav text-current transition-colors duration-150 ease-out hover:text-brand-primary"
                  key={link.href}
                  to={link.href}
                >
                  {link.label}
                </Link>
              ))}
              {actions ? (
                <div className="flex items-center gap-4 border-l border-current/20 pl-8">
                  {actions}
                </div>
              ) : null}
            </div>
            <button
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
              className="relative z-[60] inline-flex size-11 items-center justify-center rounded-pill text-current transition-colors duration-150 ease-out md:hidden"
              onClick={toggleMobileMenu}
              type="button"
            >
              {isMobileMenuOpen ? <X aria-hidden="true" size={28} /> : <Menu aria-hidden="true" size={28} />}
            </button>
          </>
        </nav>
      </header>

      {isMobileMenuMounted ? (
        <div
          className="ui-public-mobile-menu fixed inset-0 z-[55] flex items-center justify-center bg-surface-page px-6 text-text-primary md:hidden"
          data-state={isMobileMenuClosing ? "closing" : "open"}
        >
          <nav aria-label="Mobile public site navigation" className="flex flex-col items-center gap-[2.5rem]">
            {links.map((link, linkIndex) => (
              <Link
                className="ui-public-mobile-menu-link font-heading text-4xl font-medium text-text-primary transition-colors duration-150 ease-out hover:text-brand-primary sm:text-5xl"
                key={link.href}
                onClick={closeMobileMenu}
                style={resolveMobileMenuLinkStyle(linkIndex)}
                to={link.href}
              >
                {link.label}
              </Link>
            ))}
            {actions ? <div className="flex flex-col items-center gap-6">{actions}</div> : null}
          </nav>
          <svg
            aria-hidden="true"
            className="ui-public-mobile-menu-decoration pointer-events-none absolute bottom-0 left-0 right-0 w-full text-brand-primary"
            fill="none"
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,219,864,218.7C960,219,1056,181,1152,149.3C1248,117,1344,91,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : null}
    </>
  );
}

function resolveMobileMenuExitDuration(): number {
  if (typeof window === "undefined" || !window.matchMedia) {
    return MOBILE_MENU_EXIT_DURATION_MS;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : MOBILE_MENU_EXIT_DURATION_MS;
}

function resolveMobileMenuLinkStyle(linkIndex: number): CSSProperties {
  return {
    animationDelay: `${100 + linkIndex * 100}ms`,
  };
}
