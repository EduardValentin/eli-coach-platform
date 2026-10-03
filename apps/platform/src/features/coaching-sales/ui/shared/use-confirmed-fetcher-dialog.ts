import { useEffect, useEffectEvent, useState } from "react";
import { useFetcher } from "react-router";

type ConfirmedFetcherDialogOptions = {
  action: string;
  body?: Record<string, string>;
  onSettled: (answer: unknown) => void;
};

export function useConfirmedFetcherDialog({
  action,
  body = {},
  onSettled,
}: ConfirmedFetcherDialogOptions) {
  const [open, setOpen] = useState(false);
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent(onSettled);

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const send = () => {
    void submit(body, {
      action,
      encType: "application/json",
      method: "post",
    });
  };

  return {
    close: () => setOpen(false),
    open,
    openDialog: () => setOpen(true),
    pending: state !== "idle",
    send,
    setOpen,
  };
}
