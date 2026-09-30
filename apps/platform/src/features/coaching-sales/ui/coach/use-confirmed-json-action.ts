import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useState } from "react";
import { useFetcher } from "react-router";
import type { z } from "zod";

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
  const [confirming, setConfirming] = useState(false);
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((response: unknown) => {
    const sent = options.sentSchema.safeParse(response);

    if (sent.success) {
      toast.success(options.sentMessage(sent.data));
      return;
    }

    toast.error(options.failureMessage(response));
    options.onFailure?.();
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const confirm = () => {
    setConfirming(false);
    void submit(options.body, {
      action: options.action,
      encType: "application/json",
      method: "post",
    });
  };

  const confirmDialog: ConfirmDialogWiring = {
    onConfirm: confirm,
    onOpenChange: setConfirming,
    open: confirming,
  };

  return {
    askToConfirm: () => setConfirming(true),
    confirmDialog,
    isSending: state !== "idle",
  };
}
