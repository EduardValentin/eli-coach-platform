import { Button, Label, Textarea } from "@eli-coach-platform/ui/primitives";
import { useId, useState } from "react";

import {
  flaggedCount,
  REVIEW_DIALOG,
} from "~/features/client-onboarding/public/onboarding-review-copy";

type OnboardingReviewBarProps = {
  flagCount: number;
  onApprove: (() => void) | null;
  onCancel: () => void;
  onSend: (note: string) => void;
};

export function OnboardingReviewBar({
  flagCount,
  onApprove,
  onCancel,
  onSend,
}: OnboardingReviewBarProps) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const ready = flagCount > 0 && note.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 space-y-4 rounded-b-panel border-t border-border-subtle bg-surface-base px-6 pt-4 pb-6">
      <div className="space-y-2">
        <Label htmlFor={noteId}>{REVIEW_DIALOG.noteLabel}</Label>
        <Textarea
          data-parity="review-note"
          id={noteId}
          onChange={(event) => setNote(event.target.value)}
          required
          rows={2}
          value={note}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className="text-sm text-text-secondary"
          data-parity="flag-count"
          role="status"
        >
          {flaggedCount(flagCount)}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onCancel} size="sm" variant="ghost">
            {REVIEW_DIALOG.cancel}
          </Button>
          <Button
            data-parity="ask-details"
            disabled={!ready}
            onClick={() => onSend(note.trim())}
            size="sm"
            variant="outline"
          >
            {REVIEW_DIALOG.askForDetails}
          </Button>
          {onApprove ? (
            <Button
              data-parity="dialog-approve"
              onClick={onApprove}
              size="sm"
              variant="primary"
            >
              {REVIEW_DIALOG.approve}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
