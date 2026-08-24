import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";

import { cn, IconButton } from "@eli-coach-platform/ui";

import { Logo } from "./logo";

const SCROLLED_NAV_THRESHOLD = 50;
const MENU_FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const MOBILE_MENU_ID = "mobile-public-navigation-overlay";

export type PublicNavigationScrollBehavior = "hero-overlay" | "solid";
export type PublicNavigationVariant = "waitlist" | "normal";

export type PublicNavigationLink = {
  href: string;
  label: string;
};

type PublicNavigationProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
  scrollBehavior: PublicNavigationScrollBehavior;
  variant: PublicNavigationVariant;
};

export function PublicNavigation(props: PublicNavigationProps) {
  const { actions, links, scrollBehavior, variant } = props;
  const [isScrolled, setIsScrolled] = useState(scrollBehavior === "solid");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

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

  // The open menu covers the page, but the header stays above it so the cart
  // remains reachable. Keyboard focus has to respect the same boundary: the
  // reachable set is the header plus the overlay, never the obscured page.
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    overlayRef.current
      ?.querySelector<HTMLElement>(MENU_FOCUSABLE_SELECTOR)
      ?.focus();

    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const reachable = [headerRef.current, overlayRef.current]
        .filter((root): root is HTMLElement => root !== null)
        .flatMap((root) =>
          Array.from(
            root.querySelectorAll<HTMLElement>(MENU_FOCUSABLE_SELECTOR),
          ),
        )
        // The desktop links are still in the DOM below `md`, just display:none.
        // Focusing a hidden element is a no-op that would strand the cycle.
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
  }, [closeMobileMenu, isMobileMenuOpen]);

  const shouldUseSolidAppearance =
    scrollBehavior === "solid" || isScrolled || isMobileMenuOpen;
  const shouldShowNavigationControls = links.length > 0;

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[60] transition-colors duration-300 ease-out",
          {
            "bg-surface-base/95 text-text-primary shadow-public-nav backdrop-blur-md":
              shouldUseSolidAppearance,
            "bg-surface-base/0 text-text-inverted":
              !shouldUseSolidAppearance,
          },
        )}
        data-appearance={shouldUseSolidAppearance ? "solid" : "transparent"}
        ref={headerRef}
        data-launch-mode={variant}
      >
        <nav
          aria-label="Public site navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6"
        >
          <Logo
            isSolid={shouldUseSolidAppearance}
            onNavigate={closeMobileMenu}
          />
          {shouldShowNavigationControls ? (
            <>
              <PublicNavigationCluster actions={actions} links={links} />
              <MobilePublicNavigationButton
                isOpen={isMobileMenuOpen}
                onToggle={toggleMobileMenu}
              />
            </>
          ) : null}
        </nav>
      </header>
      {shouldShowNavigationControls ? (
        <MobilePublicNavigation
          isOpen={isMobileMenuOpen}
          links={links}
          onClose={closeMobileMenu}
          overlayRef={overlayRef}
        />
      ) : null}
    </>
  );
}

type PublicNavigationClusterProps = {
  actions?: ReactNode;
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
      {/* The rule separating the links from the actions is drawn as a pseudo-element
          so this wrapper still matches `:empty` when every action renders nothing —
          which is how the rule leaves the bar with them instead of dangling after
          the links. There is nothing to separate below `md`, where the links go.
          Adding a second action here must not introduce a whitespace expression
          between them — `{" "}` would defeat `:empty` and strand the rule. */}
      <div className="flex items-center gap-8 empty:hidden md:before:mx-2 md:before:block md:before:h-4 md:before:w-px md:before:bg-current/20 md:before:content-['']">
        {actions}
      </div>
    </div>
  );
}

type MobilePublicNavigationProps = {
  isOpen: boolean;
  links: readonly PublicNavigationLink[];
  onClose: () => void;
  overlayRef: RefObject<HTMLDivElement | null>;
};

function MobilePublicNavigation(props: MobilePublicNavigationProps) {
  const { isOpen, links, onClose, overlayRef } = props;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-[55] flex items-center justify-center bg-surface-page px-6 text-text-primary md:hidden"
          exit={{ opacity: 0, y: "-100%" }}
          initial={{ opacity: 0, y: "-100%" }}
          id={MOBILE_MENU_ID}
          key="mobile-public-navigation"
          ref={overlayRef}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <nav
            aria-label="Mobile public site navigation"
            className="flex flex-col items-center gap-10"
          >
            {links.map((link, linkIndex) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                key={link.href}
                transition={{ delay: 0.1 + linkIndex * 0.1, duration: 0.32, ease: "easeOut" }}
              >
                <Link
                  className="font-heading text-4xl font-medium text-text-primary transition-colors duration-150 ease-out hover:text-brand-primary sm:text-5xl"
                  onClick={onClose}
                  to={link.href}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>
          <motion.svg
            animate={{ opacity: 0.03 }}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 w-full text-brand-primary"
            fill="none"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.3, ease: "easeOut" }}
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,219,864,218.7C960,219,1056,181,1152,149.3C1248,117,1344,91,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="currentColor"
            />
          </motion.svg>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type MobilePublicNavigationButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

function MobilePublicNavigationButton(props: MobilePublicNavigationButtonProps) {
  const { isOpen, onToggle } = props;

  return (
    <IconButton
      aria-controls={MOBILE_MENU_ID}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="relative z-[60] text-current md:hidden"
      onClick={onToggle}
    >
      {isOpen ? (
        <X aria-hidden="true" size={28} />
      ) : (
        <Menu aria-hidden="true" size={28} />
      )}
    </IconButton>
  );
}
