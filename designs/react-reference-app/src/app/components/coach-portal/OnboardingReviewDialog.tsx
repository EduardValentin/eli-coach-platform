import { useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { ClientJourney } from '../../domain/journey';
import type { ReviewForm } from '../../domain/onboardingAnswers';
import { clientPronouns } from '../../utils/journeyLabels';
import { AnswerGroups } from './OnboardingPanel';
import { OnboardingReviewBar } from './OnboardingReviewBar';

export function OnboardingReviewDialog({
  open,
  onOpenChange,
  journey,
  forms,
  flagged,
  toggleFlag,
  onApprove,
  onSend,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journey: ClientJourney;
  forms: ReviewForm[];
  flagged: readonly string[];
  toggleFlag: (questionId: string) => void;
  onApprove?: () => void;
  onSend: (note: string) => void;
  onCancel: () => void;
}) {
  const [openForms, setOpenForms] = useState<string[]>(() =>
    forms.map((form) => form.formId),
  );
  const { object } = clientPronouns(journey.identity.gender);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-parity-root="OnboardingReviewDialog"
        size="wide"
      >
        <DialogHeader>
          <DialogTitle>
            Review {journey.identity.firstName}&rsquo;s answers
          </DialogTitle>
          <DialogDescription>
            Tick any answer you want {object} to revisit, then approve or ask
            for more details.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <AnswerGroups
            forms={forms}
            view={{
              openForms,
              onOpenForms: setOpenForms,
              review: { flagged, toggleFlag },
            }}
          />
        </DialogBody>

        <DialogFooter>
          <OnboardingReviewBar
            flagged={flagged}
            onSend={onSend}
            onCancel={onCancel}
            onApprove={onApprove}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
