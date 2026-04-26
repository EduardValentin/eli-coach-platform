import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import type { PublicLaunchMode } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

const SCROLLED_NAV_THRESHOLD = 50;

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
  const { actions, links, scrollBehavior, variant } = props;
  const [isScrolled, setIsScrolled] = useState(scrollBehavior === "solid");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isMobileMenuOpen]);

  const isNormalMode = variant === "normal";
  const shouldUseSolidAppearance =
    scrollBehavior === "solid" || isScrolled || isMobileMenuOpen;

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow,color] duration-300 ease-out",
          shouldUseSolidAppearance
            ? "border-border-subtle bg-surface-base/95 text-text-primary shadow-soft backdrop-blur-md"
            : "border-border-soft/0 bg-surface-base/0 text-text-inverted",
        )}
        data-appearance={shouldUseSolidAppearance ? "solid" : "transparent"}
      >
        <nav
          aria-label="Public site navigation"
          className="mx-auto flex h-20 max-w-stage items-center justify-between gap-6 px-6 lg:px-8"
        >
          <Link
            className="relative z-50 inline-flex min-w-0 items-center gap-3 rounded-xs outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
            onClick={() => setIsMobileMenuOpen(false)}
            to="/"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 shrink-0 rotate-45 items-center justify-center rounded-xs border-2 transition-colors duration-150 ease-out",
                shouldUseSolidAppearance ? "border-brand-primary" : "border-current",
              )}
            >
              <span
                className={cn(
                  "block size-3 -rotate-45 transition-colors duration-150 ease-out",
                  shouldUseSolidAppearance ? "bg-brand-primary" : "bg-current",
                )}
              />
            </span>
            <span
              className={cn(
                "truncate font-heading text-display-sm font-semibold transition-colors duration-150 ease-out",
                shouldUseSolidAppearance ? "text-text-primary" : "text-text-inverted",
              )}
            >
              Eli Fitness
            </span>
          </Link>

          {isNormalMode ? (
            <>
              <div className="hidden items-center gap-8 md:flex">
                {links.map((link) => (
                  <Link
                    className="text-body-sm font-medium text-current transition-colors duration-150 ease-out hover:text-brand-primary"
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
                aria-label={isMobileMenuOpen ? "Close public navigation" : "Open public navigation"}
                className="relative z-50 inline-flex size-11 items-center justify-center rounded-pill text-current transition-colors duration-150 ease-out hover:text-brand-primary md:hidden"
                onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
                type="button"
              >
                {isMobileMenuOpen ? <X aria-hidden="true" size={28} /> : <Menu aria-hidden="true" size={28} />}
              </button>
            </>
          ) : null}
        </nav>
      </header>

      {isNormalMode && isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-page px-6 pt-20 text-text-primary md:hidden">
          <nav aria-label="Mobile public site navigation" className="flex flex-col items-center gap-10">
            {links.map((link) => (
              <Link
                className="font-heading text-display-lg font-medium text-text-primary transition-colors duration-150 ease-out hover:text-brand-primary"
                key={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                to={link.href}
              >
                {link.label}
              </Link>
            ))}
            {actions ? <div className="flex flex-col items-center gap-6">{actions}</div> : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
