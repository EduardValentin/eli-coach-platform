import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentPropsWithoutRef, RefObject } from "react";

import { cn } from "./cn";
import { useReturnFocusToOpener } from "./use-return-focus-to-opener";

type DialogFramePlacement = "centred" | "screen";

type DialogFrameProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  "onCloseAutoFocus" | "onOpenAutoFocus"
> & {
  placement?: DialogFramePlacement;
  returnFocusTo?: RefObject<HTMLElement | null>;
};

const FRAME_CLASS =
  "fixed z-50 bg-surface-base motion-safe:data-[state=closed]:animate-[ui-popover-out_200ms_ease] motion-safe:data-[state=open]:animate-[ui-popover-in_200ms_ease]";

const PLACEMENT_CLASS = {
  centred:
    "top-1/2 left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-compact border shadow-action-hover",
  screen:
    "inset-0 flex h-dvh flex-col gap-0 overflow-hidden shadow-none pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
} satisfies Record<DialogFramePlacement, string>;

export function DialogFrame({
  children,
  className,
  placement = "centred",
  returnFocusTo,
  ...props
}: DialogFrameProps) {
  const { rememberOpener, returnFocusToOpener } =
    useReturnFocusToOpener(returnFocusTo);

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay-modal motion-safe:data-[state=closed]:animate-[ui-overlay-out_150ms_ease] motion-safe:data-[state=open]:animate-[ui-overlay-in_150ms_ease]" />
      <RadixDialog.Content
        className={cn(FRAME_CLASS, PLACEMENT_CLASS[placement], className)}
        onCloseAutoFocus={returnFocusToOpener}
        onOpenAutoFocus={rememberOpener}
        {...props}
      >
        {children}
        {placement === "centred" && (
          <RadixDialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogFrameClose = RadixDialog.Close;

export function DialogFrameTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

export function DialogFrameDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return (
    <RadixDialog.Description
      className={cn("text-sm text-text-muted", className)}
      {...props}
    />
  );
}
