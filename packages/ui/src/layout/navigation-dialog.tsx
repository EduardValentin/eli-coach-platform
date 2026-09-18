import { useReducedMotionConfig } from "motion/react";
import { Dialog as RadixDialog } from "radix-ui";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "../lib/cn";
import { MAIN_CONTENT_ID } from "../lib/constants";
import { IconButton } from "../primitives/icon-button";
import { useCloseMobileNavigationOnDesktop } from "./use-close-mobile-navigation-on-desktop";

type NavigationMenuState = "closed" | "closing" | "open";
type FocusAfterClose = "menu-button" | "main-content" | "unchanged";

export type NavigationMenu = {
  close: () => void;
  closeForAction: () => void;
  completeClose: () => void;
  firstLinkRef: RefObject<HTMLAnchorElement | null>;
  isOpen: boolean;
};

type NavigationTopBar = {
  actions: ReactNode;
  menu: NavigationMenu;
  menuButton: ReactNode;
};

type NavigationDialogProps = {
  children: (menu: NavigationMenu) => ReactNode;
  closeMenuIcon: ReactNode;
  contentClassName: string;
  menuButtonClassName: string;
  openMenuIcon: ReactNode;
  renderTopBar: (topBar: NavigationTopBar) => ReactNode;
  title: string;
  topBarActions?: ReactNode;
};

export function NavigationDialog(props: NavigationDialogProps) {
  const {
    children,
    closeMenuIcon,
    contentClassName,
    menuButtonClassName,
    openMenuIcon,
    renderTopBar,
    title,
    topBarActions,
  } = props;
  const [menuState, setMenuState] = useState<NavigationMenuState>("closed");
  const focusAfterClose = useRef<FocusAfterClose>("menu-button");
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const contentId = useId();
  const shouldReduceMotion = useReducedMotionConfig() === true;
  const isDialogMounted = menuState !== "closed";
  const isOpen = menuState === "open";

  const open = useCallback(() => {
    focusAfterClose.current = "menu-button";
    setMenuState("open");
  }, []);
  const closeImmediately = useCallback((focusTarget: FocusAfterClose) => {
    focusAfterClose.current = focusTarget;
    setMenuState("closed");
  }, []);
  const close = useCallback(() => {
    if (shouldReduceMotion) {
      setMenuState("closed");
      return;
    }
    setMenuState((currentState) =>
      currentState === "closed" ? "closed" : "closing",
    );
  }, [shouldReduceMotion]);
  const closeForAction = useCallback(() => {
    closeImmediately("unchanged");
  }, [closeImmediately]);
  const closeForDesktop = useCallback(() => {
    closeImmediately("main-content");
  }, [closeImmediately]);
  const completeClose = useCallback(() => {
    setMenuState((currentState) =>
      currentState === "closing" ? "closed" : currentState,
    );
  }, []);

  useCloseMobileNavigationOnDesktop({
    close: closeForDesktop,
    isOpen: isDialogMounted,
    mobileControlRef: menuButtonRef,
  });

  const menu: NavigationMenu = {
    close,
    closeForAction,
    completeClose,
    firstLinkRef,
    isOpen,
  };
  const menuButtonProps = {
    "aria-controls": contentId,
    "aria-expanded": isOpen,
    "aria-label": isOpen ? "Close menu" : "Open menu",
    children: isOpen ? closeMenuIcon : openMenuIcon,
    className: menuButtonClassName,
  };

  const focusFirstLink = (event: Event) => {
    const firstLink = firstLinkRef.current;
    if (firstLink === null) {
      return;
    }
    event.preventDefault();
    firstLink.focus();
  };
  const moveFocusAfterClose = (event: Event) => {
    if (focusAfterClose.current === "menu-button") {
      return;
    }
    event.preventDefault();
    if (focusAfterClose.current === "main-content") {
      document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
    }
  };
  const closeOnBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  return (
    <RadixDialog.Root
      onOpenChange={(nextOpen) => (nextOpen ? open() : close())}
      open={isDialogMounted}
    >
      <div className={cn("contents", { invisible: isDialogMounted })}>
        {renderTopBar({
          actions: isDialogMounted ? undefined : topBarActions,
          menu,
          menuButton: (
            <RadixDialog.Trigger asChild>
              <IconButton {...menuButtonProps} ref={menuButtonRef} />
            </RadixDialog.Trigger>
          ),
        })}
      </div>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={contentClassName}
          id={contentId}
          onClick={closeOnBackdropClick}
          onCloseAutoFocus={moveFocusAfterClose}
          onOpenAutoFocus={focusFirstLink}
        >
          {renderTopBar({
            actions: topBarActions,
            menu,
            menuButton: isOpen ? (
              <RadixDialog.Close asChild>
                <IconButton {...menuButtonProps} />
              </RadixDialog.Close>
            ) : (
              <IconButton {...menuButtonProps} onClick={open} />
            ),
          })}
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          {children(menu)}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
