import {
  AnimatePresence,
  motion,
  useReducedMotionConfig,
  type PanInfo,
} from "motion/react";
import { Dialog as RadixDialog } from "radix-ui";
import { useRef, type ReactNode } from "react";

import { cn } from "../lib/cn";

type BottomSheetProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  id?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
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

function isFocusLost() {
  return (
    document.activeElement === null || document.activeElement === document.body
  );
}

export function BottomSheet(props: BottomSheetProps) {
  const { children, className, description, id, onOpenChange, open, title } =
    props;
  const shouldReduceMotion = useReducedMotionConfig() === true;
  const opener = useRef<HTMLElement | null>(null);

  const rememberOpener = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const returnFocusToOpener = (event: Event) => {
    event.preventDefault();
    if (isFocusLost()) {
      opener.current?.focus();
    }
  };
  const unlessDescribed = description ? {} : { "aria-describedby": undefined };
  const overlayMotionProps = shouldReduceMotion
    ? {}
    : {
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        initial: { opacity: 0 },
        transition: SCRIM_TRANSITION,
      };
  const motionProps = shouldReduceMotion
    ? {}
    : {
        animate: { y: 0 },
        drag: "y" as const,
        dragConstraints: { bottom: 0, top: 0 },
        dragElastic: { bottom: 0.7, top: 0 },
        exit: { y: "100%" },
        initial: { y: "100%" },
        onDragEnd: (_event: unknown, info: PanInfo) => {
          if (isDismissingDrag(info)) {
            onOpenChange(false);
          }
        },
        transition: SHEET_TRANSITION,
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
              {...unlessDescribed}
              onCloseAutoFocus={returnFocusToOpener}
              onOpenAutoFocus={rememberOpener}
            >
              <motion.div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-panel bg-surface-base shadow-floating outline-none",
                  className,
                )}
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                {...motionProps}
              >
                <div
                  className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-surface-muted"
                  data-parity="sheet-handle"
                />
                <RadixDialog.Title className="sr-only">
                  {title}
                </RadixDialog.Title>
                {description && (
                  <RadixDialog.Description className="sr-only">
                    {description}
                  </RadixDialog.Description>
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
