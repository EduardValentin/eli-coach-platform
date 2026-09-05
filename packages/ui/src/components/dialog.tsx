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
      "fixed inset-0 z-[70] bg-overlay-portal backdrop-blur-sm motion-safe:data-[state=open]:animate-overlay-in motion-safe:data-[state=closed]:animate-overlay-out",
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
      // Radix hides the rest of the page from assistive tech but never sets
      // the modal flag itself; screen readers expect both.
      aria-modal="true"
      className={cn(
        "fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-surface-base p-6 text-text-primary shadow-modal outline-none motion-safe:data-[state=open]:animate-dialog-in motion-safe:data-[state=closed]:animate-dialog-out",
        className,
      )}
      {...props}
    >
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
));

DialogContent.displayName = "DialogContent";

export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex shrink-0 items-center justify-between gap-4", className)}
    {...props}
  >
    {children}
    <RadixDialog.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      <span className="sr-only">Close</span>
    </RadixDialog.Close>
  </div>
));

DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn(
      "font-heading text-display-xs font-bold text-text-primary",
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
