import { cn } from "@eli-coach-platform/ui/lib";
import { DeadEndContent } from "@eli-coach-platform/ui/layout";
import { cardVariants } from "@eli-coach-platform/ui/primitives";
import { VideoOff } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE } from "~/features/assessment-calls/contracts/assessment-calls";

const UNAVAILABLE_STATUS = 503;

function AssessmentCallsUnavailable() {
  return (
    <div
      className="mx-auto max-w-4xl pb-12 lg:px-8 lg:pt-8"
      data-parity-root="AssessmentCallsUnavailable"
    >
      <div
        className={cn(
          cardVariants({ variant: "portal-panel" }),
          "flex flex-col items-center px-6 py-16 text-center",
        )}
        role="alert"
      >
        <DeadEndContent
          description={COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE}
          icon={<VideoOff aria-hidden="true" size={36} />}
          title="Assessment calls unavailable"
        />
      </div>
    </div>
  );
}

export function AssessmentCallsErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === UNAVAILABLE_STATUS) {
    return <AssessmentCallsUnavailable />;
  }

  throw error;
}
