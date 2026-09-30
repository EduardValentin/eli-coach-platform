import { IconHint } from "@eli-coach-platform/ui/primitives";
import { TriangleAlert } from "lucide-react";

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
  const warnings = screeningWarnings(submitted);

  if (warnings.length === 0) {
    return null;
  }

  return (
    <IconHint
      icon={<TriangleAlert aria-hidden="true" size={16} />}
      label={warnings.join(". ")}
      parity="screening-warning"
      tone="danger"
    >
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </IconHint>
  );
}
