"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { cn } from "./utils";
import { useReturnFocusToOpener } from "./use-return-focus-to-opener";

const FULL_SCREEN_DIALOG_CLASS =
  "inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-none";

const dialogContentVariants = cva(
  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-compact border p-6 shadow-lg duration-200",
  {
    variants: {
      size: {
        default: "sm:max-w-lg",
        md: "sm:max-w-2xl",
        wide: "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl",
        screen: FULL_SCREEN_DIALOG_CLASS,
        viewer: `${FULL_SCREEN_DIALOG_CLASS} lg:inset-auto lg:top-[50%] lg:left-[50%] lg:h-[min(90dvh,56rem)] lg:w-[calc(100%-4rem)] lg:max-w-6xl lg:translate-x-[-50%] lg:translate-y-[-50%] lg:rounded-card lg:border lg:shadow-lg`,
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type DialogSize = NonNullable<VariantProps<typeof dialogContentVariants>["size"]>;

type DialogDismissal = "allowed" | "locked";

type ContentProps = React.ComponentProps<typeof DialogPrimitive.Content>;

type InteractOutsideEvent = Parameters<NonNullable<ContentProps["onInteractOutside"]>>[0];

function offersCloseControl(size: DialogSize | null | undefined, dismissal: DialogDismissal) {
  return dismissal === "allowed" && size !== "screen" && size !== "viewer";
}

const DialogSizeContext = React.createContext<DialogSize>("default");

function useWideDialog(): boolean {
  return React.useContext(DialogSizeContext) === "wide";
}

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay-modal",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

function DialogContent({
  className,
  children,
  size,
  dismissal = "allowed",
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: ContentProps &
  VariantProps<typeof dialogContentVariants> & { dismissal?: DialogDismissal }) {
  const { rememberOpener, returnFocusToOpener } = useReturnFocusToOpener();

  const escapeUnlessLocked = (event: KeyboardEvent) => {
    onEscapeKeyDown?.(event);
    if (dismissal === "locked") event.preventDefault();
  };

  const interactOutsideUnlessLocked = (event: InteractOutsideEvent) => {
    onInteractOutside?.(event);
    if (dismissal === "locked") event.preventDefault();
  };

  const openWithOpenerRemembered = (event: Event) => {
    rememberOpener();
    onOpenAutoFocus?.(event);
  };

  const closeWithFocusReturned = (event: Event) => {
    onCloseAutoFocus?.(event);
    if (!event.defaultPrevented) returnFocusToOpener(event);
  };

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ size }), className)}
        onCloseAutoFocus={closeWithFocusReturned}
        onEscapeKeyDown={escapeUnlessLocked}
        onInteractOutside={interactOutsideUnlessLocked}
        onOpenAutoFocus={openWithOpenerRemembered}
        {...props}
      >
        <DialogSizeContext.Provider value={size ?? "default"}>
          {children}
        </DialogSizeContext.Provider>
        {offersCloseControl(size, dismissal) && (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const wide = useWideDialog();

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        { "px-6 pt-6 pb-4": wide },
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  const wide = useWideDialog();

  return (
    <div
      data-slot="dialog-body"
      className={cn(
        { "min-h-0 flex-1 overflow-y-auto px-6 py-4": wide },
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const wide = useWideDialog();

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        {
          "border-t border-border-default/50 px-6 py-4": wide,
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end": !wide,
        },
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export type { DialogDismissal };

export {
  Dialog,
  dialogContentVariants,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
