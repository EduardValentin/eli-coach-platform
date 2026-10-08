import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import type { QuestionId } from "~/features/client-onboarding/public/onboarding";
import {
  reviewActionAcceptedSchema,
  type DetailRequestBody,
  type ReviewTarget,
} from "~/features/client-onboarding/public/onboarding-review";
import {
  emailSentToast,
  REVIEW_ACTION_FAILED,
} from "~/features/client-onboarding/public/onboarding-review-copy";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/public/paths";

type ReviewActionTarget = {
  clientId: string;
  email: string;
};

type ReviewActionOutcomes = {
  onApproved: () => void;
  onDetailsRequested: () => void;
};

type DetailRequestDraft = {
  note: string;
  questions: QuestionId[];
};

type ReviewActionPath = (typeof CLIENT_ONBOARDING_API_PATHS)[
  "reviewOpenings" | "detailRequests" | "approvals"];

function noOutcome() {}

function useReviewAction(path: ReviewActionPath, onAccepted: () => void) {
  const { data, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((response: unknown) => {
    if (reviewActionAcceptedSchema.safeParse(response).success) {
      onAccepted();
      return;
    }

    toast.error(REVIEW_ACTION_FAILED);
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  return (body: ReviewTarget | DetailRequestBody) => {
    void submit(body, {
      action: path,
      encType: "application/json",
      method: "post",
    });
  };
}

export function useOnboardingReviewActions(
  client: ReviewActionTarget,
  outcomes: ReviewActionOutcomes,
) {
  const submitOpening = useReviewAction(
    CLIENT_ONBOARDING_API_PATHS.reviewOpenings,
    noOutcome,
  );
  const submitDetailRequest = useReviewAction(
    CLIENT_ONBOARDING_API_PATHS.detailRequests,
    () => {
      toast.success(emailSentToast(client.email));
      outcomes.onDetailsRequested();
    },
  );
  const submitApproval = useReviewAction(
    CLIENT_ONBOARDING_API_PATHS.approvals,
    outcomes.onApproved,
  );

  return {
    approve: () => submitApproval({ clientId: client.clientId }),
    askForDetails: ({ note, questions }: DetailRequestDraft) =>
      submitDetailRequest({ clientId: client.clientId, note, questions }),
    openReview: () => submitOpening({ clientId: client.clientId }),
  };
}
