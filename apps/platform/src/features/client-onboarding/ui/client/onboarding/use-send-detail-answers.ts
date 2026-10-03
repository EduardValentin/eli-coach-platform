import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import {
  submissionAcceptedSchema,
  submissionProblemsSchema,
  type AnswerDetailsRequest,
  type SubmissionProblem,
} from "~/features/client-onboarding/contracts/onboarding";
import { ANSWER_REQUEST_COPY } from "~/features/client-onboarding/contracts/onboarding-review-copy";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";

type AnswerDetailsOutcome =
  | { kind: "accepted"; redirectTo: string }
  | { kind: "invalid"; problems: SubmissionProblem[] }
  | { kind: "failed" };

type SendDetailAnswersOptions = {
  onRefused: (problems: readonly SubmissionProblem[]) => void;
};

const ANSWER_DETAILS_FAILED: AnswerDetailsOutcome = { kind: "failed" };

function answerDetailsOutcomeOf(response: unknown): AnswerDetailsOutcome {
  const accepted = submissionAcceptedSchema.safeParse(response);
  if (accepted.success) {
    return { kind: "accepted", redirectTo: accepted.data.redirectTo };
  }

  const problems = submissionProblemsSchema.safeParse(response);

  return problems.success
    ? { kind: "invalid", problems: problems.data.problems }
    : ANSWER_DETAILS_FAILED;
}

export function useSendDetailAnswers({ onRefused }: SendDetailAnswersOptions) {
  const navigate = useNavigate();
  const { data, state, submit } = useFetcher<unknown>();
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  const outcome = useMemo(
    () => (data === undefined ? null : answerDetailsOutcomeOf(data)),
    [data],
  );
  const sending = state !== "idle" || outcome?.kind === "accepted";

  const settle = useEffectEvent((settled: AnswerDetailsOutcome) => {
    if (settled.kind === "accepted") {
      void navigate(settled.redirectTo);
      return;
    }

    if (settled.kind === "invalid") {
      onRefused(settled.problems);
      return;
    }

    setSendProblem(ANSWER_REQUEST_COPY.sendProblem);
  });

  useEffect(() => {
    if (outcome) {
      settle(outcome);
    }
  }, [outcome]);

  const send = (request: AnswerDetailsRequest) => {
    setSendProblem(null);

    void submit(request, {
      action: CLIENT_ONBOARDING_API_PATHS.detailAnswers,
      defaultShouldRevalidate: false,
      encType: "application/json",
      method: "post",
    });
  };

  return { send, sendProblem, sending };
}
