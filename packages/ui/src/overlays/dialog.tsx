import { X } from "lucide-react";
import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";

import { cn } from "../lib/cn";

export const Dialog = RadixDialog.Root;

type DialogSize = "compact" | "wide";

type DialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  "onCloseAutoFocus" | "onOpenAutoFocus" | "title"
> & {
  description: React.ReactNode;
  footer: React.ReactNode;
  size?: DialogSize;
  title: React.ReactNode;
};

const CONTENT_CLASS =
  "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-compact border bg-surface-base shadow-action-hover motion-safe:data-[state=closed]:animate-[ui-popover-out_200ms_ease] motion-safe:data-[state=open]:animate-[ui-popover-in_200ms_ease]";
const HEADER_CLASS = "flex flex-col gap-2 text-center sm:text-left";
const DESCRIPTION_CLASS = "text-sm text-text-muted";

const SIZE_CLASSES = {
  compact: {
    content: "grid max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md",
    description: "leading-relaxed",
    footer: "flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end",
    header: undefined,
  },
  wide: {
    content: "flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl",
    description: undefined,
    footer: "border-t border-border-default/50 px-6 py-4",
    header: "px-6 pt-6 pb-4",
  },
} satisfies Record<
  DialogSize,
  Record<"content" | "description" | "footer" | "header", string | undefined>
>;

export function DialogContent({
  children,
  className,
  description,
  footer,
  size = "compact",
  title,
  ...props
}: DialogContentProps) {
  const opener = React.useRef<HTMLElement | null>(null);
  const sizeClasses = SIZE_CLASSES[size];

  const rememberOpener = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  const returnFocusToOpener = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay-modal motion-safe:data-[state=closed]:animate-[ui-overlay-out_150ms_ease] motion-safe:data-[state=open]:animate-[ui-overlay-in_150ms_ease]" />
      <RadixDialog.Content
        className={cn(CONTENT_CLASS, sizeClasses.content, className)}
        onCloseAutoFocus={returnFocusToOpener}
        onOpenAutoFocus={rememberOpener}
        {...props}
      >
        <div className={cn(HEADER_CLASS, sizeClasses.header)}>
          <RadixDialog.Title className="text-lg leading-none font-semibold">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            className={cn(DESCRIPTION_CLASS, sizeClasses.description)}
          >
            {description}
          </RadixDialog.Description>
        </div>
        <DialogBody size={size}>{children}</DialogBody>
        <div className={sizeClasses.footer}>{footer}</div>
        <RadixDialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

function DialogBody({
  children,
  size,
}: {
  children: React.ReactNode;
  size: DialogSize;
}) {
  if (size === "compact") {
    return children;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
  );
}
