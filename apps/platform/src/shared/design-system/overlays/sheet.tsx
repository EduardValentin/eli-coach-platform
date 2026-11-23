import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";

import { cn } from "../lib/cn";
import { useReturnFocusToOpener } from "../lib/use-return-focus-to-opener";

export const Sheet = RadixDialog.Root;

export const SheetTrigger = RadixDialog.Trigger;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-sheet-overlay bg-overlay-strong motion-safe:transition-opacity",
      className,
    )}
    {...props}
  />
));

SheetOverlay.displayName = "SheetOverlay";

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn(
      "pr-12 font-heading text-display-sm font-medium text-text-primary",
      className,
    )}
    {...props}
  />
));

SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("mt-2 text-sm text-text-secondary", className)}
    {...props}
  />
));

SheetDescription.displayName = "SheetDescription";

type SheetSide = "left" | "right";

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
> & {
  closeButtonRef?: React.Ref<HTMLButtonElement>;
  side?: SheetSide;
};

const SIDE_CLASSES = {
  left: "inset-y-0 left-0 w-80 max-w-full -translate-x-full pt-16",
  right:
    "inset-0 w-full translate-x-full p-6 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-w-lg",
} satisfies Record<SheetSide, string>;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  SheetContentProps
>(
  (
    {
      children,
      className,
      closeButtonRef,
      onCloseAutoFocus,
      onOpenAutoFocus,
      side = "right",
      ...props
    },
    ref,
  ) => {
    const { rememberOpener, returnFocusToOpener } = useReturnFocusToOpener();

    return (
      <RadixDialog.Portal>
        <SheetOverlay />
        <RadixDialog.Content
          ref={ref}
          className={cn(
            "fixed z-sheet flex h-dvh flex-col overflow-y-auto bg-surface-base text-text-primary shadow-floating outline-none motion-safe:transition-transform data-[state=open]:translate-x-0 motion-reduce:transition-none",
            SIDE_CLASSES[side],
            className,
          )}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (!event.defaultPrevented) returnFocusToOpener(event);
          }}
          onOpenAutoFocus={(event) => {
            rememberOpener();
            onOpenAutoFocus?.(event);
          }}
          {...props}
        >
          {children}
          <RadixDialog.Close
            ref={closeButtonRef}
            className="absolute right-5 top-4 inline-flex size-control-md items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);

SheetContent.displayName = "SheetContent";
