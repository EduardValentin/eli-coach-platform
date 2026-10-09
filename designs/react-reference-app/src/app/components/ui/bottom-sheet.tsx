import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useRef, type ReactNode, type RefObject } from 'react';

import type { DialogDismissal } from './dialog';
import { cn } from './utils';

interface BottomSheetProps {
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  dismissal?: DialogDismissal;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const SHEET_TRANSITION = { type: 'spring', damping: 30, stiffness: 300 } as const;
const SCRIM_TRANSITION = { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] } as const;
const DISMISS_DRAG_OFFSET = 120;
const DISMISS_DRAG_VELOCITY = 800;

function isDismissingDrag(info: PanInfo) {
  return info.offset.y > DISMISS_DRAG_OFFSET || info.velocity.y > DISMISS_DRAG_VELOCITY;
}

function isFocusLost() {
  return document.activeElement === null || document.activeElement === document.body;
}

export function BottomSheet({
  id,
  open,
  onOpenChange,
  title,
  description,
  className,
  dismissal = 'allowed',
  initialFocus,
  children,
}: BottomSheetProps) {
  const shouldReduceMotion = useReducedMotion() === true;
  const opener = useRef<HTMLElement | null>(null);

  const rememberOpener = (event: Event) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocus?.current;
    if (!target) return;

    event.preventDefault();
    target.focus();
  };
  const returnFocusToOpener = (event: Event) => {
    event.preventDefault();
    if (isFocusLost()) {
      opener.current?.focus();
    }
  };
  const descriptionAttributes = description ? {} : { 'aria-describedby': undefined };
  const overlayMotionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: SCRIM_TRANSITION,
      };
  const locked = dismissal === 'locked';
  const preventWhenLocked = (event: Event) => {
    if (locked) event.preventDefault();
  };
  const dragToDismissProps = locked
    ? {}
    : {
        drag: 'y' as const,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.7 },
        onDragEnd: (_event: unknown, info: PanInfo) => {
          if (isDismissingDrag(info)) {
            onOpenChange(false);
          }
        },
      };
  const sheetMotionProps = shouldReduceMotion
    ? {}
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: SHEET_TRANSITION,
        ...dragToDismissProps,
      };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-overlay-strong" {...overlayMotionProps} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              id={id}
              {...descriptionAttributes}
              onCloseAutoFocus={returnFocusToOpener}
              onEscapeKeyDown={preventWhenLocked}
              onInteractOutside={preventWhenLocked}
              onOpenAutoFocus={rememberOpener}
            >
              <motion.div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-panel bg-surface-base shadow-floating outline-none pb-[env(safe-area-inset-bottom)]',
                  className,
                )}
                {...sheetMotionProps}
              >
                <div
                  className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-surface-muted"
                  data-parity="sheet-handle"
                />
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="sr-only">
                    {description}
                  </DialogPrimitive.Description>
                )}
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
