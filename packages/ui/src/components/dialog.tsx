import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";

import { cn } from "../lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[70] bg-overlay-strong motion-safe:transition-opacity",
      className,
    )}
    {...props}
  />
));

DialogOverlay.displayName = "DialogOverlay";

export type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
>;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  DialogContentProps
>(({ children, className, ...props }, ref) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-border-subtle bg-surface-base p-6 text-text-primary shadow-floating outline-none motion-safe:transition-[opacity,transform]",
        className,
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close className="absolute right-5 top-5 inline-flex size-control-md items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
        <span aria-hidden="true" className="text-2xl leading-none">
          ×
        </span>
        <span className="sr-only">Close</span>
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));

DialogContent.displayName = "DialogContent";

export const DialogTitle = React.forwardRef<
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

DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("mt-2 text-body-sm text-text-secondary", className)}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";
