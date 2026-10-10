import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode, RefObject } from "react";

import { cn } from "../lib/cn";

import {
  DialogFrame,
  DialogFrameDescription,
  DialogFrameTitle,
  type DialogDismissal,
} from "../lib/dialog-frame";
import { BottomSheet } from "./bottom-sheet";
import { useIsMobileViewport } from "../lib/viewport";

type SheetDialogWidth = "full" | "fit";

type ResponsiveSheetDialogProps = {
  children: ReactNode;
  description?: string;
  dismissal?: DialogDismissal;
  initialFocus?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  width?: SheetDialogWidth;
};

const DIALOG_WIDTH_CLASS: Record<SheetDialogWidth, string> = {
  full: "",
  fit: "sm:w-fit",
};

export function ResponsiveSheetDialog({
  children,
  description,
  dismissal = "allowed",
  initialFocus,
  onOpenChange,
  open,
  title,
  width = "full",
}: ResponsiveSheetDialogProps) {
  const isMobileViewport = useIsMobileViewport();

  if (isMobileViewport) {
    return (
      <BottomSheet
        description={description}
        dismissal={dismissal}
        initialFocus={initialFocus}
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
          DIALOG_WIDTH_CLASS[width],
        )}
        dismissal={dismissal}
        initialFocus={initialFocus}
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
