import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";
import { useReturnFocusToOpener } from "./use-return-focus-to-opener";

type DialogFrameProps = Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  "onCloseAutoFocus" | "onOpenAutoFocus"
>;

const FRAME_CLASS =
  "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-compact border bg-surface-base shadow-action-hover motion-safe:data-[state=closed]:animate-[ui-popover-out_200ms_ease] motion-safe:data-[state=open]:animate-[ui-popover-in_200ms_ease]";

export function DialogFrame({
  children,
  className,
  ...props
}: DialogFrameProps) {
  const { rememberOpener, returnFocusToOpener } = useReturnFocusToOpener();

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay-modal motion-safe:data-[state=closed]:animate-[ui-overlay-out_150ms_ease] motion-safe:data-[state=open]:animate-[ui-overlay-in_150ms_ease]" />
      <RadixDialog.Content
        className={cn(FRAME_CLASS, className)}
        onCloseAutoFocus={returnFocusToOpener}
        onOpenAutoFocus={rememberOpener}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

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
