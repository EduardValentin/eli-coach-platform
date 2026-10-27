import {
  useConfirmedFetcherDialog,
  type DialogAfterAnswer,
} from "../lib/use-confirmed-fetcher-dialog";

import { toast } from "./toaster";

type SentReading<Sent> = { success: true; data: Sent } | { success: false };

type ConfirmedJsonAction<Sent> = {
  action: string;
  body: Record<string, string>;
  sentSchema: { safeParse: (answer: unknown) => SentReading<Sent> };
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
