import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import {
  DialogFrame,
  DialogFrameDescription,
  DialogFrameTitle,
} from "../lib/dialog-frame";
import { BottomSheet } from "./bottom-sheet";
import { useIsMobileViewport } from "./use-is-mobile-viewport";

type ResponsiveSheetDialogProps = {
  children: ReactNode;
  contentClassName?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ResponsiveSheetDialog({
  children,
  contentClassName,
  description,
  onOpenChange,
  open,
  title,
}: ResponsiveSheetDialogProps) {
  const isMobileViewport = useIsMobileViewport();

  if (isMobileViewport) {
    return (
      <BottomSheet
        description={description}
        onOpenChange={onOpenChange}
        open={open}
        title={title}
      >
        {children}
      </BottomSheet>
    );
  }

  const descriptionAttributes = description
    ? {}
    : { "aria-describedby": undefined };

  return (
    <RadixDialog.Root onOpenChange={onOpenChange} open={open}>
      <DialogFrame
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-2xl",
          contentClassName,
        )}
        {...descriptionAttributes}
      >
        <DialogFrameTitle className="sr-only">{title}</DialogFrameTitle>
        {description && (
          <DialogFrameDescription className="sr-only">
            {description}
          </DialogFrameDescription>
        )}
        {children}
      </DialogFrame>
    </RadixDialog.Root>
  );
}
