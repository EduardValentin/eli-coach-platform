import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useReducedMotion } from 'motion/react';
import {
  useCallback,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { useCloseMobileNavigationOnDesktop } from './use-close-mobile-navigation-on-desktop';

type NavigationMenuState = 'closed' | 'closing' | 'open';
type FocusAfterClose = 'menu-button' | 'main-content' | 'unchanged';

export type NavigationMenu = {
  close: () => void;
  closeForAction: () => void;
  completeClose: () => void;
  firstLinkRef: RefObject<HTMLAnchorElement>;
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

function focusMainContent() {
  const mainContent = document.querySelector<HTMLElement>('main');
  if (mainContent === null) {
    return;
  }
  if (!mainContent.hasAttribute('tabindex')) {
    mainContent.tabIndex = -1;
  }
  mainContent.focus({ preventScroll: true });
}

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
  const [menuState, setMenuState] = useState<NavigationMenuState>('closed');
  const focusAfterClose = useRef<FocusAfterClose>('menu-button');
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const contentId = useId();
  const shouldReduceMotion = useReducedMotion() === true;
  const isDialogMounted = menuState !== 'closed';
  const isOpen = menuState === 'open';

  const open = useCallback(() => {
    focusAfterClose.current = 'menu-button';
    setMenuState('open');
  }, []);
  const closeImmediately = useCallback((focusTarget: FocusAfterClose) => {
    focusAfterClose.current = focusTarget;
    setMenuState('closed');
  }, []);
  const close = useCallback(() => {
    if (shouldReduceMotion) {
      setMenuState('closed');
      return;
    }
    setMenuState((currentState) => (currentState === 'closed' ? 'closed' : 'closing'));
  }, [shouldReduceMotion]);
  const closeForAction = useCallback(() => {
    closeImmediately('unchanged');
  }, [closeImmediately]);
  const closeForDesktop = useCallback(() => {
    closeImmediately('main-content');
  }, [closeImmediately]);
  const completeClose = useCallback(() => {
    setMenuState((currentState) => (currentState === 'closing' ? 'closed' : currentState));
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
    'aria-controls': contentId,
    'aria-expanded': isOpen,
    'aria-label': isOpen ? 'Close menu' : 'Open menu',
    children: isOpen ? closeMenuIcon : openMenuIcon,
    className: menuButtonClassName,
    type: 'button' as const,
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
    if (focusAfterClose.current === 'menu-button') {
      return;
    }
    event.preventDefault();
    if (focusAfterClose.current === 'main-content') {
      focusMainContent();
    }
  };
  const closeOnBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  return (
    <DialogPrimitive.Root
      onOpenChange={(nextOpen) => (nextOpen ? open() : close())}
      open={isDialogMounted}
    >
      <div className={isDialogMounted ? 'contents invisible' : 'contents'}>
        {renderTopBar({
          actions: isDialogMounted ? undefined : topBarActions,
          menu,
          menuButton: (
            <DialogPrimitive.Trigger asChild>
              <button {...menuButtonProps} ref={menuButtonRef} />
            </DialogPrimitive.Trigger>
          ),
        })}
      </div>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0" />
        <DialogPrimitive.Content
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
              <DialogPrimitive.Close asChild>
                <button {...menuButtonProps} />
              </DialogPrimitive.Close>
            ) : (
              <button {...menuButtonProps} onClick={open} />
            ),
          })}
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children(menu)}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
