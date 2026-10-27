import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import {
  DialogFrame,
  DialogFrameClose,
  DialogFrameTitle,
} from "../lib/dialog-frame";

export const ViewerDialog = RadixDialog.Root;

export const ViewerDialogClose = DialogFrameClose;

export const ViewerDialogTitle = DialogFrameTitle;

type ViewerDialogContentProps = Omit<
  ComponentPropsWithoutRef<typeof DialogFrame>,
  "aria-describedby" | "placement"
>;

export function ViewerDialogContent(props: ViewerDialogContentProps) {
  return (
    <DialogFrame aria-describedby={undefined} placement="viewer" {...props} />
  );
}
