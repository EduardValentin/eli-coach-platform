import { toast } from "@eli-coach-platform/ui/toast";
import type { z } from "zod";

import { useConfirmedFetcherDialog } from "~/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog";

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
    onSettled: (response) => {
      const sent = options.sentSchema.safeParse(response);

      if (sent.success) {
        toast.success(options.sentMessage(sent.data));
        return;
      }

      toast.error(options.failureMessage(response));
      options.onFailure?.();
    },
  });

  const confirm = () => {
    confirmed.close();
    confirmed.send();
  };

  const confirmDialog: ConfirmDialogWiring = {
    onConfirm: confirm,
    onOpenChange: confirmed.setOpen,
    open: confirmed.open,
  };

  return {
    askToConfirm: confirmed.openDialog,
    confirmDialog,
    isSending: confirmed.pending,
  };
}
