import { Dialog as RadixDialog } from "radix-ui";
import { useState, type ReactNode, type RefObject } from "react";

import { cn } from "../lib/cn";

import {
  DialogFrame,
  DialogFrameDescription,
  DialogFrameTitle,
  type DialogDismissal,
} from "../lib/dialog-frame";
import { BottomSheet } from "./bottom-sheet";
import {
  SheetCloseContext,
  ShownHeaderContext,
  type SheetClose,
  type ShownHeader,
} from "./sheet-dialog-parts";
import { useIsMobileViewport } from "../lib/viewport";

type SheetDialogWidth = "full" | "fit" | "media";

type ResponsiveSheetDialogProps = {
  children: ReactNode;
  description?: string;
  dismissal?: DialogDismissal;
  initialFocus?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusTo?: RefObject<HTMLElement | null>;
  sheetClose?: SheetClose;
  title: string;
  width?: SheetDialogWidth;
};

const DIALOG_WIDTH_CLASS: Record<SheetDialogWidth, string> = {
  full: "",
  fit: "sm:w-fit",
  media: "sm:max-w-4xl",
};

export function ResponsiveSheetDialog({
  children,
  description,
  dismissal = "allowed",
  initialFocus,
  onOpenChange,
  open,
  returnFocusTo,
  sheetClose = "none",
  title,
  width = "full",
}: ResponsiveSheetDialogProps) {
  const isMobileViewport = useIsMobileViewport();
  const [shownHeader, setShownHeader] = useState<ShownHeader | null>(null);
  const spokenDescription = shownHeader ? shownHeader.description : description;
  const content = (
    <ShownHeaderContext.Provider value={setShownHeader}>
      {children}
    </ShownHeaderContext.Provider>
  );

  if (isMobileViewport) {
    return (
      <BottomSheet
        description={spokenDescription}
        dismissal={dismissal}
        initialFocus={initialFocus}
        labels={shownHeader ? "shown" : "spoken"}
        onOpenChange={onOpenChange}
        open={open}
        returnFocusTo={returnFocusTo}
        title={title}
      >
        <SheetCloseContext.Provider
          value={dismissal === "allowed" ? sheetClose : "none"}
        >
          {content}
        </SheetCloseContext.Provider>
      </BottomSheet>
    );
  }

  const descriptionAttributes = spokenDescription
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
        returnFocusTo={returnFocusTo}
        {...descriptionAttributes}
      >
        {!shownHeader && (
          <>
            <DialogFrameTitle className="sr-only">{title}</DialogFrameTitle>
            {description && (
              <DialogFrameDescription className="sr-only">
                {description}
              </DialogFrameDescription>
            )}
          </>
        )}
        {content}
      </DialogFrame>
    </RadixDialog.Root>
  );
}
