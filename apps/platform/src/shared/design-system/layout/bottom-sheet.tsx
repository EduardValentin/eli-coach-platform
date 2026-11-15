import {
  AnimatePresence,
  motion,
  useReducedMotionConfig,
  type PanInfo,
} from "motion/react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode, RefObject } from "react";

import { cn } from "../lib/cn";
import {
  focusOnOpen,
  preventDismissalWhenLocked,
  type DialogDismissal,
} from "../lib/dialog-frame";
import { useReturnFocusToOpener } from "../lib/use-return-focus-to-opener";

type BottomSheetLabels = "spoken" | "shown";

type BottomSheetProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  dismissal?: DialogDismissal;
  id?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  labels?: BottomSheetLabels;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusTo?: RefObject<HTMLElement | null>;
  title: string;
};

const SHEET_TRANSITION = {
  damping: 30,
  stiffness: 300,
  type: "spring",
} as const;
const SCRIM_TRANSITION = { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] } as const;
const DISMISS_DRAG_OFFSET = 120;
const DISMISS_DRAG_VELOCITY = 800;

function isDismissingDrag(info: PanInfo) {
  return (
    info.offset.y > DISMISS_DRAG_OFFSET ||
    info.velocity.y > DISMISS_DRAG_VELOCITY
  );
}

export function BottomSheet(props: BottomSheetProps) {
  const {
    children,
    className,
    description,
    dismissal = "allowed",
    id,
    initialFocus,
    labels = "spoken",
    onOpenChange,
    open,
    returnFocusTo,
    title,
  } = props;
  const shouldReduceMotion = useReducedMotionConfig() === true;
  const { rememberOpener, returnLostFocusToOpener } =
    useReturnFocusToOpener(returnFocusTo);

  const openWithOpenerRemembered = (event: Event) => {
    rememberOpener();
    focusOnOpen(initialFocus, event);
  };
  const descriptionAttributes = description
    ? {}
    : { "aria-describedby": undefined };
  const overlayMotionProps = shouldReduceMotion
    ? {}
    : {
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        initial: { opacity: 0 },
        transition: SCRIM_TRANSITION,
      };
  const preventWhenLocked = preventDismissalWhenLocked(dismissal);
  const dragToDismissProps =
    dismissal === "locked"
      ? {}
      : {
          drag: "y" as const,
          dragConstraints: { bottom: 0, top: 0 },
          dragElastic: { bottom: 0.7, top: 0 },
          onDragEnd: (_event: unknown, info: PanInfo) => {
            if (isDismissingDrag(info)) {
              onOpenChange(false);
            }
          },
        };
  const sheetMotionProps = shouldReduceMotion
    ? {}
    : {
        animate: { y: 0 },
        exit: { y: "100%" },
        initial: { y: "100%" },
        transition: SHEET_TRANSITION,
        ...dragToDismissProps,
      };

  return (
    <RadixDialog.Root onOpenChange={onOpenChange} open={open}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-overlay-strong"
                {...overlayMotionProps}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content
              asChild
              id={id}
              {...descriptionAttributes}
              onCloseAutoFocus={returnLostFocusToOpener}
              onEscapeKeyDown={preventWhenLocked}
              onInteractOutside={preventWhenLocked}
              onOpenAutoFocus={openWithOpenerRemembered}
            >
              <motion.div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-panel bg-surface-base shadow-floating outline-none pb-[env(safe-area-inset-bottom)]",
                  className,
                )}
                {...sheetMotionProps}
              >
                <div
                  className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-surface-muted"
                  data-parity="sheet-handle"
                />
                {labels === "spoken" && (
                  <>
                    <RadixDialog.Title className="sr-only">
                      {title}
                    </RadixDialog.Title>
                    {description && (
                      <RadixDialog.Description className="sr-only">
                        {description}
                      </RadixDialog.Description>
                    )}
                  </>
                )}
                {children}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
