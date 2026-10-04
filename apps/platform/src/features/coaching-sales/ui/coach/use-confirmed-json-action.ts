import { toast } from "@eli-coach-platform/ui/toast";
import type { z } from "zod";

import {
  useConfirmedFetcherDialog,
  type DialogAfterAnswer,
} from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

type ConfirmedJsonAction<Sent> = {
  action: string;
  body: Record<string, string>;
  sentSchema: z.ZodType<Sent>;
  sentMessage: (sent: Sent) => string;
  failureMessage: (response: unknown) => string;
  onFailure?: () => void;
};

type ConfirmDialogWiring = {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function useConfirmedJsonAction<Sent>(
  options: ConfirmedJsonAction<Sent>,
) {
  const confirmed = useConfirmedFetcherDialog({
    action: options.action,
    body: options.body,
    readAnswer: (answer): DialogAfterAnswer => {
      const sent = options.sentSchema.safeParse(answer);

      if (sent.success) {
        toast.success(options.sentMessage(sent.data));
        return { dialog: "unchanged" };
      }

      toast.error(options.failureMessage(answer));
      options.onFailure?.();
      return { dialog: "unchanged" };
    },
  });

  const confirm = () => {
    confirmed.closeDialog();
    confirmed.confirm();
  };

  const confirmDialog: ConfirmDialogWiring = {
    onConfirm: confirm,
    onOpenChange: confirmed.onOpenChange,
    open: confirmed.open,
  };

  return {
    askToConfirm: confirmed.openDialog,
    confirmDialog,
    isSending: confirmed.pending,
  };
}
