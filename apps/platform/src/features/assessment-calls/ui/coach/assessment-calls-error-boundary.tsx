import { DeadEndPanel } from "@eli-coach-platform/ui/layout";
import { VideoOff } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import {
  COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
  COACH_ASSESSMENT_CALLS_UNAVAILABLE_STATUS,
} from "~/features/assessment-calls/contracts/assessment-calls";

function AssessmentCallsUnavailable() {
  return (
    <div className="w-full" data-parity-root="AssessmentCallsUnavailable">
      <DeadEndPanel
        description={COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE}
        icon={<VideoOff aria-hidden="true" size={36} />}
        title="Assessment calls unavailable"
      />
    </div>
  );
}

export function AssessmentCallsErrorBoundary() {
  const error = useRouteError();

  if (
    isRouteErrorResponse(error) &&
    error.status === COACH_ASSESSMENT_CALLS_UNAVAILABLE_STATUS
  ) {
    return <AssessmentCallsUnavailable />;
  }

  throw error;
}
