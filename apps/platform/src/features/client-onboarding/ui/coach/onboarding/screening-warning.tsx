import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@eli-coach-platform/ui/primitives";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import type { SubmittedReview } from "~/features/client-onboarding/contracts/onboarding-review";
import { SCREENING_COPY } from "~/features/client-onboarding/contracts/onboarding-review-copy";

type ScreeningWarningProps = {
  submitted: SubmittedReview;
};

function screeningWarnings(submitted: SubmittedReview): string[] {
  const warnings: string[] = [];

  if (submitted.screening.outcome === "needs-review") {
    warnings.push(SCREENING_COPY.needsReview(submitted.screening.yesCount));
  }

  if (submitted.screening.outcome === "manual") {
    warnings.push(SCREENING_COPY.manual);
  }

  if (submitted.withholdsNutritionAdvice) {
    warnings.push(SCREENING_COPY.nutritionOnHold);
  }

  return warnings;
}

export function ScreeningWarning({ submitted }: ScreeningWarningProps) {
  const [open, setOpen] = useState(false);
  const warnings = screeningWarnings(submitted);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={warnings.join(". ")}
          className="inline-flex size-6 items-center justify-center rounded-full text-feedback-danger"
          data-parity="screening-warning"
          onBlur={() => setOpen(false)}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              setOpen(true);
            }
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(true);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(false);
            }
          }}
          type="button"
        >
          <TriangleAlert aria-hidden="true" size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-fit max-w-xs space-y-1 rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-none"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="bottom"
      >
        {warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </PopoverContent>
    </Popover>
  );
}
