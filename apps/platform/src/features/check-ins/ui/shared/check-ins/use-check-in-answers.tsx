import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  generatePath,
  useFetcher,
  useFetchers,
  useRevalidator,
  useSubmit,
} from "react-router";

import {
  checkInAnswerSchema,
  checkInRefusalSchema,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

export type CheckInAnswerKind = "approve" | "decline" | "withdraw";

type SentAnswer = {
  checkInId: string;
  kind: CheckInAnswerKind;
  success: string;
};

const ANSWER_PATHS: Record<CheckInAnswerKind, string> = {
  approve: CHECK_INS_API_PATHS.approval,
  decline: CHECK_INS_API_PATHS.decline,
  withdraw: CHECK_INS_API_PATHS.withdrawal,
};

const BUSY_LABELS: Record<CheckInAnswerKind, string> = {
  approve: "Approving…",
  decline: "Declining…",
  withdraw: "Cancelling…",
};

const FAILURE_COPY: Record<CheckInAnswerKind, string> = {
  approve: "The check-in wasn't approved. Try again.",
  decline: "The check-in wasn't declined. Try again.",
  withdraw: "Your request wasn't cancelled. Try again.",
};

const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";

export function useCheckInAnswers() {
  const submit = useSubmit();
  const [sent, setSent] = useState<readonly SentAnswer[]>([]);
  const inFlight = new Set(useFetchers().map((fetcher) => fetcher.key));

  const answering = (checkInId: string): CheckInAnswerKind | null =>
    inFlight.has(fetcherKeyOf(checkInId))
      ? (sent.find((answer) => answer.checkInId === checkInId)?.kind ?? null)
      : null;

  return {
    answer: (answer: SentAnswer) => {
      setSent((current) => [
        ...current.filter(({ checkInId }) => checkInId !== answer.checkInId),
        answer,
      ]);
      void submit(null, {
        action: generatePath(ANSWER_PATHS[answer.kind], {
          checkInId: answer.checkInId,
        }),
        fetcherKey: fetcherKeyOf(answer.checkInId),
        method: "post",
        navigate: false,
      });
    },
    answering,
    labelFor: (
      checkInId: string,
      { kind, label }: { kind: CheckInAnswerKind; label: string },
    ) => (answering(checkInId) === kind ? BUSY_LABELS[kind] : label),
    outcomes: sent.map((answer) => (
      <CheckInAnswerOutcome
        answer={answer}
        key={answer.checkInId}
        onSettled={() =>
          setSent((current) => current.filter((pending) => pending !== answer))
        }
      />
    )),
  };
}

function CheckInAnswerOutcome({
  answer,
  onSettled,
}: {
  answer: SentAnswer;
  onSettled: () => void;
}) {
  const { data } = useFetcher<unknown>({
    key: fetcherKeyOf(answer.checkInId),
  });
  const { revalidate } = useRevalidator();
  const dataWhenSent = useRef(data);

  const settle = useEffectEvent((received: unknown) => {
    if (checkInAnswerSchema.safeParse(received).success) {
      toast.success(answer.success);
    } else if (checkInRefusalSchema.safeParse(received).success) {
      toast.error(NO_LONGER_WAITING);
      void revalidate();
    } else {
      toast.error(FAILURE_COPY[answer.kind]);
    }
    onSettled();
  });

  useEffect(() => {
    if (data !== undefined && data !== dataWhenSent.current) {
      settle(data);
    }
  }, [data]);

  return null;
}

function fetcherKeyOf(checkInId: string): string {
  return `check-in-answer:${checkInId}`;
}
