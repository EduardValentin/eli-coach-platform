import { Menu, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import type { WaitingListLaunchMode } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";

import { EliFitnessLogo } from "./logo";

const SCROLLED_NAV_THRESHOLD = 50;

export type PublicNavigationScrollBehavior = "hero-overlay" | "solid";

export type PublicNavigationLink = {
  href: string;
  label: string;
};

type PublicNavigationProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
  scrollBehavior: PublicNavigationScrollBehavior;
  variant: WaitingListLaunchMode;
};

export function PublicNavigation(props: PublicNavigationProps) {
  const { actions, links, scrollBehavior, variant } = props;
  const [isScrolled, setIsScrolled] = useState(scrollBehavior === "solid");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((currentIsOpen) => !currentIsOpen);
  }, []);

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
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

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
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [closeMobileMenu, isMobileMenuOpen]);

  const shouldUseSolidAppearance =
    scrollBehavior === "solid" || isScrolled || isMobileMenuOpen;

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[60] transition-colors duration-300 ease-out",
          shouldUseSolidAppearance &&
            "bg-surface-base/95 text-text-primary shadow-public-nav backdrop-blur-md",
          !shouldUseSolidAppearance && "bg-surface-base/0 text-text-inverted",
        )}
        data-appearance={shouldUseSolidAppearance ? "solid" : "transparent"}
        data-launch-mode={variant}
      >
        <nav
          aria-label="Public site navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6"
        >
          <EliFitnessLogo
            isSolid={shouldUseSolidAppearance}
            onNavigate={closeMobileMenu}
          />
          <DesktopPublicNavigation actions={actions} links={links} />
          <MobilePublicNavigationButton
            isOpen={isMobileMenuOpen}
            onToggle={toggleMobileMenu}
          />
        </nav>
      </header>
      <MobilePublicNavigation
        actions={actions}
        isOpen={isMobileMenuOpen}
        links={links}
        onClose={closeMobileMenu}
      />
    </>
  );
}

type DesktopPublicNavigationProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
};

function DesktopPublicNavigation(props: DesktopPublicNavigationProps) {
  const { actions, links } = props;

  return (
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
  );
}

type MobilePublicNavigationProps = {
  actions?: ReactNode;
  isOpen: boolean;
  links: readonly PublicNavigationLink[];
  onClose: () => void;
};

function MobilePublicNavigation(props: MobilePublicNavigationProps) {
  const { actions, isOpen, links, onClose } = props;

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "ui-public-mobile-menu fixed inset-0 z-[55] flex items-center justify-center bg-surface-page px-6 text-text-primary md:hidden",
        isOpen && "pointer-events-auto",
        !isOpen && "pointer-events-none",
      )}
      data-state={isOpen ? "open" : "closed"}
      inert={!isOpen ? true : undefined}
    >
      <nav
        aria-label="Mobile public site navigation"
        className="flex flex-col items-center gap-[2.5rem]"
      >
        {links.map((link, linkIndex) => (
          <Link
            className="ui-public-mobile-menu-link font-heading text-4xl font-medium text-text-primary transition-colors duration-150 ease-out hover:text-brand-primary sm:text-5xl"
            key={link.href}
            onClick={onClose}
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
  );
}

type MobilePublicNavigationButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

function MobilePublicNavigationButton(props: MobilePublicNavigationButtonProps) {
  const { isOpen, onToggle } = props;

  return (
    <button
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="relative z-[60] inline-flex size-11 items-center justify-center rounded-pill text-current transition-colors duration-150 ease-out md:hidden"
      onClick={onToggle}
      type="button"
    >
        {isOpen ? (
          <X aria-hidden="true" size={28} />
        ) : (
          <Menu aria-hidden="true" size={28} />
        )}
      </button>
  );
}

function resolveMobileMenuLinkStyle(linkIndex: number): CSSProperties {
  return {
    animationDelay: `${100 + linkIndex * 100}ms`,
  };
}
