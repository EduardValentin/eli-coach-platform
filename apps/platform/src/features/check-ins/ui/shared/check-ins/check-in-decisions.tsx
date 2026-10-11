import { Button } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  generatePath,
  useFetcher,
  useFetchers,
  useRevalidator,
  useSubmit,
} from "react-router";

import {
  checkInOutcomeSchema,
  checkInRefusalSchema,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

type CheckInDecisionKind = "approve" | "decline" | "withdraw";

type CheckInDecision = {
  checkInId: string;
  kind: CheckInDecisionKind;
  successMessage: string;
};

type CheckInDecisionsOptions = {
  timeZone?: string;
};

export type CheckInDecisions = ReturnType<typeof useCheckInDecisions>;

type CheckInDecisionButtonProps = Pick<
  ComponentProps<typeof Button>,
  "size" | "variant"
> & {
  decision: CheckInDecision;
  decisions: CheckInDecisions;
  label: string;
};

type CheckInWithdrawalProps = Pick<ComponentProps<typeof Button>, "size"> & {
  checkInId: string;
  decisions: CheckInDecisions;
};

type CheckInAnswersProps = CheckInWithdrawalProps & {
  approvedMessage: string;
};

const DECISION_PATHS: Record<CheckInDecisionKind, string> = {
  approve: CHECK_INS_API_PATHS.approval,
  decline: CHECK_INS_API_PATHS.decline,
  withdraw: CHECK_INS_API_PATHS.withdrawal,
};

const BUSY_LABELS: Record<CheckInDecisionKind, string> = {
  approve: "Approving…",
  decline: "Declining…",
  withdraw: "Cancelling…",
};

const FAILURE_COPY: Record<CheckInDecisionKind, string> = {
  approve: "The check-in wasn't approved. Try again.",
  decline: "The check-in wasn't declined. Try again.",
  withdraw: "Your request wasn't cancelled. Try again.",
};

const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";

export function useCheckInDecisions({
  timeZone,
}: CheckInDecisionsOptions = {}) {
  const submit = useSubmit();
  const [sent, setSent] = useState<readonly CheckInDecision[]>([]);
  const inFlight = new Set(useFetchers().map((fetcher) => fetcher.key));
  const answer: Record<string, string> =
    timeZone === undefined ? {} : { timeZone };

  return {
    decide: (decision: CheckInDecision) => {
      setSent((current) => [
        ...current.filter(({ checkInId }) => checkInId !== decision.checkInId),
        decision,
      ]);
      void submit(answer, {
        action: generatePath(DECISION_PATHS[decision.kind], {
          checkInId: decision.checkInId,
        }),
        encType: "application/json",
        fetcherKey: fetcherKeyOf(decision.checkInId),
        method: "post",
        navigate: false,
      });
    },
    decidingKindOf: (checkInId: string): CheckInDecisionKind | null =>
      inFlight.has(fetcherKeyOf(checkInId))
        ? (sent.find((decision) => decision.checkInId === checkInId)?.kind ??
          null)
        : null,
    forget: (decision: CheckInDecision) =>
      setSent((current) => current.filter((pending) => pending !== decision)),
    sent,
  };
}

function CheckInDecisionButton({
  decision,
  decisions,
  label,
  size,
  variant,
}: CheckInDecisionButtonProps) {
  const deciding = decisions.decidingKindOf(decision.checkInId);
  const isBusy = deciding === decision.kind;

  return (
    <Button
      aria-busy={isBusy || undefined}
      disabled={deciding !== null}
      onClick={() => decisions.decide(decision)}
      size={size}
      variant={variant}
    >
      {isBusy ? BUSY_LABELS[decision.kind] : label}
    </Button>
  );
}

export function CheckInWithdrawal({
  checkInId,
  decisions,
  size,
}: CheckInWithdrawalProps) {
  return (
    <CheckInDecisionButton
      decision={{
        checkInId,
        kind: "withdraw",
        successMessage: "Request cancelled",
      }}
      decisions={decisions}
      label="Cancel request"
      size={size}
      variant="outline"
    />
  );
}

export function CheckInAnswers({
  approvedMessage,
  checkInId,
  decisions,
  size,
}: CheckInAnswersProps) {
  return (
    <>
      <CheckInDecisionButton
        decision={{
          checkInId,
          kind: "decline",
          successMessage: "Check-in declined",
        }}
        decisions={decisions}
        label="Decline"
        size={size}
        variant="ghost"
      />
      <CheckInDecisionButton
        decision={{
          checkInId,
          kind: "approve",
          successMessage: approvedMessage,
        }}
        decisions={decisions}
        label="Approve"
        size={size}
      />
    </>
  );
}

export function CheckInDecisionOutcomes({
  decisions,
}: {
  decisions: CheckInDecisions;
}) {
  return decisions.sent.map((decision) => (
    <CheckInDecisionOutcome
      decision={decision}
      key={decision.checkInId}
      onReported={() => decisions.forget(decision)}
    />
  ));
}

function CheckInDecisionOutcome({
  decision,
  onReported,
}: {
  decision: CheckInDecision;
  onReported: () => void;
}) {
  const { data } = useFetcher<unknown>({
    key: fetcherKeyOf(decision.checkInId),
  });
  const { revalidate } = useRevalidator();
  const dataWhenSent = useRef(data);

  const reportReply = useEffectEvent((reply: unknown) => {
    if (checkInOutcomeSchema.safeParse(reply).success) {
      toast.success(decision.successMessage);
    } else if (checkInRefusalSchema.safeParse(reply).success) {
      toast.error(NO_LONGER_WAITING);
      void revalidate();
    } else {
      toast.error(FAILURE_COPY[decision.kind]);
    }
    onReported();
  });

  useEffect(() => {
    if (data !== undefined && data !== dataWhenSent.current) {
      reportReply(data);
    }
  }, [data]);

  return null;
}

function fetcherKeyOf(checkInId: string): string {
  return `check-in-decision:${checkInId}`;
}
