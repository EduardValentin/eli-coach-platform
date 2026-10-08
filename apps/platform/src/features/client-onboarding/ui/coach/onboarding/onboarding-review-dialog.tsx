import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { Dialog, DialogContent } from "@eli-coach-platform/ui/overlays";
import { useState } from "react";

import type { QuestionId } from "~/features/client-onboarding/public/onboarding";
import type { ReviewForm } from "~/features/client-onboarding/public/onboarding-review";
import { REVIEW_DIALOG } from "~/features/client-onboarding/public/onboarding-review-copy";

import { AnswerGroups } from "./answer-groups";
import { OnboardingReviewBar } from "./onboarding-review-bar";

const NO_QUESTIONS: readonly QuestionId[] = [];

type OnboardingReviewDialogProps = {
  firstName: string;
  flagged: readonly QuestionId[] | null;
  forms: ReviewForm[];
  gender: VisitorGender;
  onApprove: (() => void) | null;
  onClose: () => void;
  onSend: (note: string) => void;
  onToggleFlag: (question: QuestionId) => void;
};

export function OnboardingReviewDialog({
  firstName,
  flagged,
  forms,
  gender,
  onApprove,
  onClose,
  onSend,
  onToggleFlag,
}: OnboardingReviewDialogProps) {
  const [openForms, setOpenForms] = useState<string[]>(() =>
    forms.map((form) => form.formId),
  );
  const flags = flagged ?? NO_QUESTIONS;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={flagged !== null}
    >
      <DialogContent
        data-parity-root="OnboardingReviewDialog"
        description={REVIEW_DIALOG.description(gender)}
        footer={
          <OnboardingReviewBar
            flagCount={flags.length}
            onApprove={onApprove}
            onCancel={onClose}
            onSend={onSend}
          />
        }
        size="wide"
        title={REVIEW_DIALOG.title(firstName)}
      >
        <AnswerGroups
          forms={forms}
          view={{
            asked: NO_QUESTIONS,
            onOpenForms: setOpenForms,
            openForms,
            review: { flagged: flags, onToggleFlag },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
