import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import {
  NavigationDialog,
  type NavigationMenu,
} from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";

import { Logo } from "./logo";

const SCROLLED_NAV_THRESHOLD = 50;
const MOBILE_NAVIGATION_LABEL = "Mobile public site navigation";
const ACTIONS_ROW_CLASS_NAME =
  "flex items-center gap-8 empty:hidden md:before:mx-2 md:before:block md:before:h-4 md:before:w-px md:before:bg-current/20 md:before:content-['']";

export type PublicNavigationScrollBehavior = "hero-overlay" | "solid";
export type PublicNavigationVariant = "waitlist" | "normal";
type PublicNavigationAppearance = "solid" | "transparent";

export type PublicNavigationLink = {
  href: string;
  label: string;
};

type PublicNavigationProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
  mobileActions?: ReactNode;
  scrollBehavior: PublicNavigationScrollBehavior;
  variant: PublicNavigationVariant;
};

export function PublicNavigation(props: PublicNavigationProps) {
  const { actions, links, mobileActions, scrollBehavior, variant } = props;
  const [isScrolled, setIsScrolled] = useState(scrollBehavior === "solid");

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

  const scrollAppearance: PublicNavigationAppearance =
    scrollBehavior === "solid" || isScrolled ? "solid" : "transparent";

  if (links.length === 0) {
    return (
      <PublicNavigationHeader appearance={scrollAppearance} variant={variant} />
    );
  }

  return (
    <NavigationDialog
      closeMenuIcon={<X aria-hidden="true" size={28} />}
      contentClassName="fixed inset-0 z-[55] outline-none md:hidden"
      menuButtonClassName="relative z-[60] text-current md:hidden"
      openMenuIcon={<Menu aria-hidden="true" size={28} />}
      renderTopBar={(topBar) => (
        <PublicNavigationHeader
          appearance={topBar.menu.isOpen ? "solid" : scrollAppearance}
          onNavigateHome={topBar.menu.close}
          variant={variant}
        >
          <PublicNavigationCluster actions={topBar.actions} links={links} />
          {topBar.menuButton}
        </PublicNavigationHeader>
      )}
      title={MOBILE_NAVIGATION_LABEL}
      topBarActions={actions}
      topBarActionsClassName={ACTIONS_ROW_CLASS_NAME}
    >
      {(menu) => (
        <MobilePublicNavigation
          links={links}
          menu={menu}
          mobileActions={mobileActions}
        />
      )}
    </NavigationDialog>
  );
}

type PublicNavigationHeaderProps = {
  appearance: PublicNavigationAppearance;
  children?: ReactNode;
  onNavigateHome?: () => void;
  variant: PublicNavigationVariant;
};

function PublicNavigationHeader(props: PublicNavigationHeaderProps) {
  const { appearance, children, onNavigateHome, variant } = props;
  const isSolid = appearance === "solid";

  return (
    <header
      className={cn(
        "group fixed left-0 right-0 top-0 z-[60] transition-colors duration-300 ease-out",
        {
          "bg-surface-base/95 text-text-primary shadow-public-nav backdrop-blur-md":
            isSolid,
          "bg-surface-base/0 text-text-inverted": !isSolid,
        },
      )}
      data-appearance={appearance}
      data-launch-mode={variant}
    >
      <nav
        aria-label="Public site navigation"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6"
      >
        <Logo isSolid={isSolid} onNavigate={onNavigateHome} />
        {children}
      </nav>
    </header>
  );
}

type PublicNavigationClusterProps = {
  actions: ReactNode;
  links: readonly PublicNavigationLink[];
};

// The links collapse into the mobile menu below `md`, but the actions stay in the
// bar at every width, so this cluster holds both and hides only the links.
function PublicNavigationCluster(props: PublicNavigationClusterProps) {
  const { actions, links } = props;

  return (
    <div className="flex items-center gap-8">
      <div className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <Link
            className="text-sm font-medium tracking-nav text-current transition-colors duration-150 ease-out hover:text-brand-primary"
            key={link.href}
            to={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {actions}
    </div>
  );
}

type MobilePublicNavigationProps = {
  links: readonly PublicNavigationLink[];
  menu: NavigationMenu;
  mobileActions?: ReactNode;
};

function MobilePublicNavigation(props: MobilePublicNavigationProps) {
  const { links, menu, mobileActions } = props;
  const prefersReducedMotion = useClientReducedMotionPreference();
  const transition = {
    duration: prefersReducedMotion ? 0 : 0.5,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-surface-page px-6 text-text-primary"
      transition={transition}
      variants={{
        closed: { opacity: 0, y: prefersReducedMotion ? 0 : "-100%" },
        open: { opacity: 1, y: 0 },
      }}
    >
      <nav
        aria-label="Public site menu"
        className="flex flex-col items-center gap-10"
      >
        {links.map((link, linkIndex) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            key={link.href}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    delay: 0.1 + linkIndex * 0.1,
                    duration: 0.32,
                    ease: "easeOut",
                  }
            }
          >
            <Link
              className="font-heading text-4xl font-medium text-text-primary transition-colors duration-150 ease-out hover:text-brand-primary sm:text-5xl"
              onClick={menu.close}
              ref={linkIndex === 0 ? menu.firstLinkRef : undefined}
              to={link.href}
            >
              {link.label}
            </Link>
          </motion.div>
        ))}
        {mobileActions ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            onClick={menu.close}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    delay: 0.1 + links.length * 0.1,
                    duration: 0.32,
                    ease: "easeOut",
                  }
            }
          >
            {mobileActions}
          </motion.div>
        ) : null}
      </nav>
      <motion.svg
        animate={{ opacity: 0.03 }}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 w-full text-brand-primary"
        fill="none"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { delay: 0.5, duration: 0.3, ease: "easeOut" }
        }
        viewBox="0 0 1440 320"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,219,864,218.7C960,219,1056,181,1152,149.3C1248,117,1344,91,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="currentColor"
        />
      </motion.svg>
    </motion.div>
  );
}
