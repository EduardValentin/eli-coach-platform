import { cn } from "@eli-coach-platform/ui/lib";
import {
  DeadEndContent,
  DEAD_END_BODY_CLASS_NAME,
} from "@eli-coach-platform/ui/layout";
import { cardVariants } from "@eli-coach-platform/ui/primitives";
import { VideoOff } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import { COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE } from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_CALLS_PAGE_FRAME_CLASS_NAME } from "~/features/assessment-calls/ui/coach/coach-calls-page-frame";

const UNAVAILABLE_STATUS = 503;

function AssessmentCallsUnavailable() {
  return (
    <div
      className={COACH_CALLS_PAGE_FRAME_CLASS_NAME}
      data-parity-root="AssessmentCallsUnavailable"
    >
      <div
        className={cn(
          cardVariants({ variant: "portal-panel" }),
          DEAD_END_BODY_CLASS_NAME,
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
