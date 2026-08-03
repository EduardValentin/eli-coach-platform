import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";

import { cn } from "../lib/cn";
import {
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "./dialog";

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = DialogClose;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;

export type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
>;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  SheetContentProps
>(({ children, className, ...props }, ref) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed inset-0 z-[71] flex h-dvh w-full translate-x-full flex-col overflow-y-auto bg-surface-base p-6 text-text-primary shadow-floating outline-none motion-safe:transition-transform data-[state=open]:translate-x-0 motion-reduce:transition-none sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:max-w-lg",
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

SheetContent.displayName = "SheetContent";
