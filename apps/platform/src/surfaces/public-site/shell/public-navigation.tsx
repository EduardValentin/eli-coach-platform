import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";

import {
  NavigationDialog,
  NavigationDialogClose,
  NavigationDialogContent,
  NavigationDialogOverlay,
  NavigationDialogPortal,
  NavigationDialogTitle,
  NavigationDialogTrigger,
  useCloseMobileNavigationOnDesktop,
} from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { IconButton } from "@eli-coach-platform/ui/primitives";

import { Logo } from "./logo";

const SCROLLED_NAV_THRESHOLD = 50;
const MOBILE_MENU_ID = "mobile-public-navigation-overlay";

export type PublicNavigationScrollBehavior = "hero-overlay" | "solid";
export type PublicNavigationVariant = "waitlist" | "normal";
type MobileMenuState = "closed" | "closing" | "open";

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
  const [mobileMenuState, setMobileMenuState] =
    useState<MobileMenuState>("closed");
  const isMobileDialogOpen = mobileMenuState !== "closed";
  const isMobileMenuOpen = mobileMenuState === "open";
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuState((currentState) =>
      currentState === "closed" ? "closed" : "closing",
    );
  }, []);
  const closeMobileMenuImmediately = useCallback(() => {
    setMobileMenuState("closed");
  }, []);
  const reopenMobileMenu = useCallback(() => {
    setMobileMenuState("open");
  }, []);
  const completeMobileMenuClose = useCallback(() => {
    setMobileMenuState((currentState) =>
      currentState === "closing" ? "closed" : currentState,
    );
  }, []);

  useCloseMobileNavigationOnDesktop({
    close: closeMobileMenuImmediately,
    isOpen: isMobileDialogOpen,
    mobileControlRef: mobileTriggerRef,
  });

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

  const shouldUseSolidAppearance =
    scrollBehavior === "solid" || isScrolled || isMobileMenuOpen;
  const shouldShowNavigationControls = links.length > 0;

  // Radix traps focus inside DialogContent, so the open header must live in
  // that subtree while the page copy keeps the stable trigger for restoration.
  const renderHeader = (placement: "page" | "dialog") => {
    const isActiveHeader =
      placement === "dialog" ? isMobileDialogOpen : !isMobileDialogOpen;

    return (
      <header
        className={cn(
          // `group` scopes descendants such as AuthNavActions' portal pill to
          // this header's own `data-appearance`, so a control nested several
          // levels down (inside the actions slot) can still switch its look
          // with the scroll state via `group-data-[appearance=solid]:*`
          // instead of threading a boolean prop through every layer.
          "group fixed left-0 right-0 top-0 z-[60] transition-colors duration-300 ease-out",
          {
            "bg-surface-base/95 text-text-primary shadow-public-nav backdrop-blur-md":
              shouldUseSolidAppearance,
            "bg-surface-base/0 text-text-inverted": !shouldUseSolidAppearance,
            invisible: !isActiveHeader,
          },
        )}
        data-appearance={shouldUseSolidAppearance ? "solid" : "transparent"}
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
              <PublicNavigationCluster
                actions={isActiveHeader ? actions : undefined}
                links={links}
                onAction={
                  placement === "dialog"
                    ? closeMobileMenuImmediately
                    : undefined
                }
              />
              <MobilePublicNavigationButton
                isOpen={isMobileMenuOpen}
                onReopen={reopenMobileMenu}
                placement={placement}
                triggerRef={mobileTriggerRef}
              />
            </>
          ) : null}
        </nav>
      </header>
    );
  };

  return (
    <NavigationDialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setMobileMenuState("open");
          return;
        }
        closeMobileMenu();
      }}
      open={isMobileDialogOpen}
    >
      {renderHeader("page")}
      {shouldShowNavigationControls ? (
        <MobilePublicNavigation
          dialogHeader={renderHeader("dialog")}
          isOpen={isMobileMenuOpen}
          links={links}
          mobileActions={mobileActions}
          onClose={closeMobileMenu}
          onExitComplete={completeMobileMenuClose}
        />
      ) : null}
    </NavigationDialog>
  );
}

type PublicNavigationClusterProps = {
  actions?: ReactNode;
  links: readonly PublicNavigationLink[];
  onAction?: () => void;
};

// The links collapse into the mobile menu below `md`, but the actions stay in the
// bar at every width, so this cluster holds both and hides only the links.
function PublicNavigationCluster(props: PublicNavigationClusterProps) {
  const { actions, links, onAction } = props;

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
      <div
        className="flex items-center gap-8 empty:hidden md:before:mx-2 md:before:block md:before:h-4 md:before:w-px md:before:bg-current/20 md:before:content-['']"
        onClickCapture={onAction}
      >
        {actions}
      </div>
    </div>
  );
}

type MobilePublicNavigationProps = {
  dialogHeader: ReactNode;
  isOpen: boolean;
  links: readonly PublicNavigationLink[];
  mobileActions?: ReactNode;
  onClose: () => void;
  onExitComplete: () => void;
};

function MobilePublicNavigation(props: MobilePublicNavigationProps) {
  const {
    dialogHeader,
    isOpen,
    links,
    mobileActions,
    onClose,
    onExitComplete,
  } = props;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useClientReducedMotionPreference();
  const transition = {
    duration: prefersReducedMotion ? 0 : 0.5,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <NavigationDialogPortal>
      <NavigationDialogOverlay className="fixed inset-0" />
      <NavigationDialogContent
        aria-describedby={undefined}
        className="fixed inset-0 z-[55] outline-none md:hidden"
        id={MOBILE_MENU_ID}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogRef.current
            ?.querySelector<HTMLElement>(
              'nav[aria-label="Mobile public site navigation"] a[href]',
            )
            ?.focus();
        }}
        onCloseAutoFocus={(event) => {
          const anotherDialogIsOpen = Array.from(
            document.querySelectorAll<HTMLElement>('[role="dialog"]'),
          ).some((dialog) => dialog !== dialogRef.current);

          if (anotherDialogIsOpen) {
            event.preventDefault();
          }
        }}
        ref={dialogRef}
      >
        {dialogHeader}
        <NavigationDialogTitle className="sr-only">
          Mobile public site navigation
        </NavigationDialogTitle>
        <motion.div
          animate={
            isOpen
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: prefersReducedMotion ? 0 : "-100%" }
          }
          className="absolute inset-0 flex items-center justify-center bg-surface-page px-6 text-text-primary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: "-100%" }}
          onAnimationComplete={onExitComplete}
          transition={transition}
        >
          <nav
            aria-label="Mobile public site navigation"
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
                  onClick={onClose}
                  to={link.href}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            {mobileActions ? (
              // A single wrapping click handler closes the menu for whichever
              // control inside actually fires — the portal pill link or the
              // Sign In/Out button — instead of threading `onClose` down into
              // AuthNavActions, which has no reason to know this menu exists.
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                onClick={onClose}
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
      </NavigationDialogContent>
    </NavigationDialogPortal>
  );
}

type MobilePublicNavigationButtonProps = {
  isOpen: boolean;
  onReopen: () => void;
  placement: "page" | "dialog";
  triggerRef: RefObject<HTMLButtonElement | null>;
};

function MobilePublicNavigationButton(
  props: MobilePublicNavigationButtonProps,
) {
  const { isOpen, onReopen, placement, triggerRef } = props;

  const button = (
    <IconButton
      aria-controls={MOBILE_MENU_ID}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="relative z-[60] text-current md:hidden"
      onClick={placement === "dialog" && !isOpen ? onReopen : undefined}
      ref={placement === "page" ? triggerRef : undefined}
    >
      {isOpen ? (
        <X aria-hidden="true" size={28} />
      ) : (
        <Menu aria-hidden="true" size={28} />
      )}
    </IconButton>
  );

  if (placement === "page") {
    return <NavigationDialogTrigger asChild>{button}</NavigationDialogTrigger>;
  }

  return isOpen ? (
    <NavigationDialogClose asChild>{button}</NavigationDialogClose>
  ) : (
    button
  );
}
