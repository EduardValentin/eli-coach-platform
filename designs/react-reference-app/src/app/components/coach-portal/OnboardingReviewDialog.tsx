import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { ClientJourney } from '../../domain/journey';
import type { ReviewForm } from '../../domain/onboardingAnswers';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            Review {journey.identity.firstName}&rsquo;s answers
          </DialogTitle>
          <DialogDescription>
            Tick any answer you want her to revisit, then approve or ask for
            more details.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AnswerGroups
            forms={forms}
            view={{
              openForms,
              onOpenForms: setOpenForms,
              review: { flagged, toggleFlag },
            }}
          />
        </div>

        <div className="border-t border-border/50 px-6 py-4">
          <OnboardingReviewBar
            flagged={flagged}
            onSend={onSend}
            onCancel={onCancel}
            onApprove={onApprove}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
