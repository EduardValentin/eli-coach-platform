import { useEffect, useEffectEvent, useState } from "react";
import { useFetcher } from "react-router";

export type DialogAfterAnswer =
  | { dialog: "close" }
  | { dialog: "unchanged" }
  | { dialog: "problem"; message: string };

type ConfirmedFetcherDialogOptions = {
  action: string;
  body?: Record<string, string>;
  readAnswer: (answer: unknown) => DialogAfterAnswer;
};

export function useConfirmedFetcherDialog({
  action,
  body = {},
  readAnswer,
}: ConfirmedFetcherDialogOptions) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((answer: unknown) => {
    const after = readAnswer(answer);

    if (after.dialog === "problem") {
      setProblem(after.message);
    }

    if (after.dialog === "close") {
      setOpen(false);
    }
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);

    if (!next) {
      setProblem(null);
    }
  };

  const confirm = () => {
    setProblem(null);
    void submit(body, {
      action,
      encType: "application/json",
      method: "post",
    });
  };

  return {
    confirm,
    onOpenChange,
    open,
    openDialog: () => setOpen(true),
    pending: state !== "idle",
    problem,
  };
}
