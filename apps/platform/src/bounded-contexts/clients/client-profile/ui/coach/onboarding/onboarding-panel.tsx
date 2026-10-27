import type { VisitorGender } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/shared/design-system/lib";
import {
  CollapsiblePortalWidget,
  PortalWidget,
} from "~/shared/design-system/portal";
import { Button } from "~/shared/design-system/primitives";
import { ConfirmDialog } from "~/shared/design-system/overlays";
import { ClipboardList, MessageSquareText } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { QuestionId } from "~/bounded-contexts/clients/client-profile/public/onboarding";
import type {
  OnboardingReviewView,
  OpenDetailRequest,
  ReviewStage,
  SubmittedReview,
} from "~/bounded-contexts/clients/client-profile/public/onboarding-review";
import {
  answersNotInLine,
  ANSWERS_HEADING,
  APPROVE_ACTION,
  APPROVE_CONFIRM,
  PANEL_TITLE,
  REVIEW_ACTIONS,
  waitingLine,
} from "~/bounded-contexts/clients/client-profile/public/onboarding-review-copy";

import { AnswerGroups } from "./answer-groups";
import { OnboardingReviewDialog } from "./onboarding-review-dialog";
import { toggleQuestion } from "./question-ids";
import { ScreeningWarning } from "./screening-warning";
import { useOnboardingReviewActions } from "./use-onboarding-review-actions";

type ReviewedClient = {
  email: string;
  firstName: string;
  gender: VisitorGender;
  coachingCancelledOrEnded: boolean;
};

type OnboardingPanelProps = {
  client: ReviewedClient;
  review: OnboardingReviewView;
  statusBadge: ReactNode;
};

type SubmittedOnboardingProps = {
  client: ReviewedClient;
  review: OnboardingReviewView;
  submitted: SubmittedReview;
};

type StageActionsProps = {
  onApprove: () => void;
  onReview: () => void;
  stage: ReviewStage;
};

const NO_QUESTIONS: readonly QuestionId[] = [];

function RequestStatus({ request }: { request: OpenDetailRequest }) {
  const timeZone = useCalendarDayTimeZone();

  return (
    <div
      className="space-y-1 text-sm text-text-secondary"
      data-parity="request-status"
    >
      <p className="flex items-center gap-2">
        <MessageSquareText aria-hidden="true" size={16} />
        {waitingLine(
          request.questions.length,
          formatDayMonth(request.askedAt, timeZone),
        )}
      </p>
      <blockquote className="border-l-2 border-border-subtle pl-3 italic">
        {request.note}
      </blockquote>
    </div>
  );
}

function StageActions({ onApprove, onReview, stage }: StageActionsProps) {
  if (stage !== "awaiting-review" && stage !== "in-review") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          data-parity="review-action"
          onClick={onReview}
          size="sm"
          variant="outline"
        >
          {REVIEW_ACTIONS[stage]}
        </Button>
        <Button
          data-parity="approve-action"
          onClick={onApprove}
          size="sm"
          variant="primary"
        >
          {APPROVE_ACTION}
        </Button>
      </div>
    </div>
  );
}

function SubmittedOnboarding({
  client,
  review,
  submitted,
}: SubmittedOnboardingProps) {
  const [openForms, setOpenForms] = useState<string[]>([]);
  const [flagged, setFlagged] = useState<QuestionId[] | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const request = submitted.openRequest;
  const actions = useOnboardingReviewActions(
    { clientId: review.clientId, email: client.email },
    {
      onApproved: () => {
        setConfirmingApproval(false);
        setFlagged(null);
      },
      onDetailsRequested: () => setFlagged(null),
    },
  );

  const enterReview = () => {
    if (submitted.stage === "awaiting-review") {
      actions.openReview();
    }
    setFlagged([]);
  };

  const toggleFlag = (question: QuestionId) => {
    setFlagged((current) => toggleQuestion(current ?? [], question));
  };

  const askForDetails = (note: string) => {
    actions.askForDetails({ note, questions: flagged ?? [] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3" data-parity="answers-section">
        <h3 className="text-sm font-medium text-text-primary">
          {ANSWERS_HEADING}
        </h3>
        {request ? <RequestStatus request={request} /> : null}
        <AnswerGroups
          forms={submitted.forms}
          view={{
            asked: request?.questions ?? NO_QUESTIONS,
            onOpenForms: setOpenForms,
            openForms,
            review: null,
          }}
        />
      </div>

      {client.coachingCancelledOrEnded ? null : (
        <StageActions
          onApprove={() => setConfirmingApproval(true)}
          onReview={enterReview}
          stage={submitted.stage}
        />
      )}

      <OnboardingReviewDialog
        firstName={client.firstName}
        flagged={flagged}
        gender={client.gender}
        forms={submitted.forms}
        onApprove={
          submitted.stage === "in-review"
            ? () => setConfirmingApproval(true)
            : null
        }
        onClose={() => setFlagged(null)}
        onSend={askForDetails}
        onToggleFlag={toggleFlag}
      />

      <ConfirmDialog
        confirmLabel={APPROVE_CONFIRM.confirm}
        description={APPROVE_CONFIRM.description}
        onConfirm={actions.approve}
        onOpenChange={setConfirmingApproval}
        open={confirmingApproval}
        title={APPROVE_CONFIRM.title(client.firstName)}
      />
    </div>
  );
}

export function OnboardingPanel({
  client,
  review,
  statusBadge,
}: OnboardingPanelProps) {
  const submitted = review.submitted;
  const frame = {
    action: statusBadge,
    className: "mb-8",
    "data-parity-root": "OnboardingPanel",
    headingId: "onboarding-panel-heading",
    icon: ClipboardList,
    title: PANEL_TITLE,
    titleAdornment: submitted ? (
      <ScreeningWarning submitted={submitted} />
    ) : null,
  };
  const body = submitted ? (
    <SubmittedOnboarding
      client={client}
      review={review}
      submitted={submitted}
    />
  ) : (
    <p className="text-sm text-text-secondary">
      {answersNotInLine(client.gender)}
    </p>
  );

  if (submitted?.stage === "approved") {
    return <CollapsiblePortalWidget {...frame}>{body}</CollapsiblePortalWidget>;
  }

  return <PortalWidget {...frame}>{body}</PortalWidget>;
}
