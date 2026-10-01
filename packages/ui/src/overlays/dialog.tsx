import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";

import { cn } from "../lib/cn";
import {
  DialogFrame,
  DialogFrameDescription,
  DialogFrameTitle,
} from "../lib/dialog-frame";

export const Dialog = RadixDialog.Root;

type DialogSize = "compact" | "wide";

type DialogFooterAlignment = "content" | "end";

type DialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  "onCloseAutoFocus" | "onOpenAutoFocus" | "title"
> & {
  description: React.ReactNode;
  descriptionParity?: string;
  footer: React.ReactNode;
  footerAlignment?: DialogFooterAlignment;
  footerParity?: string;
  size?: DialogSize;
  title: React.ReactNode;
};

const HEADER_CLASS = "flex flex-col gap-2 text-center sm:text-left";

const SIZE_CLASSES = {
  compact: {
    content: "grid max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md",
    description: "leading-relaxed",
    footer: "flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end",
    header: undefined,
  },
  wide: {
    content: "flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-3xl",
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
  descriptionParity,
  footer,
  footerAlignment = "content",
  footerParity,
  size = "compact",
  title,
  ...props
}: DialogContentProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <DialogFrame className={cn(sizeClasses.content, className)} {...props}>
      <div className={cn(HEADER_CLASS, sizeClasses.header)}>
        <DialogFrameTitle>{title}</DialogFrameTitle>
        <DialogFrameDescription
          className={sizeClasses.description}
          data-parity={descriptionParity}
        >
          {description}
        </DialogFrameDescription>
      </div>
      <DialogBody size={size}>{children}</DialogBody>
      <div
        className={cn(sizeClasses.footer, {
          "flex justify-end": footerAlignment === "end",
        })}
        data-parity={footerParity}
      >
        {footer}
      </div>
    </DialogFrame>
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
