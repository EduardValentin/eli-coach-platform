import { cn } from "@eli-coach-platform/ui/lib";
import { cardVariants } from "@eli-coach-platform/ui/primitives";
import { VideoOff } from "lucide-react";

import { COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE } from "~/features/assessment-calls/contracts/assessment-calls";

export function AssessmentCallsUnavailable() {
  return (
    <div
      className={cn(
        cardVariants({ variant: "portal-panel" }),
        "flex flex-col items-center px-6 py-16 text-center",
      )}
      data-parity-root="AssessmentCallsUnavailable"
      role="alert"
    >
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-surface-subtle text-text-muted">
        <VideoOff aria-hidden="true" size={36} />
      </div>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        Assessment calls unavailable
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-text-secondary">
        {COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE}
      </p>
    </div>
  );
}
