import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  classifyCalls,
  countCallsLeftToday,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { UpcomingCallsWidget } from "~/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget";
import { useCoachClock } from "~/features/assessment-calls/ui/coach/use-coach-clock";

export { AssessmentCallsErrorBoundary as ErrorBoundary } from "~/features/assessment-calls/ui/coach/assessment-calls-error-boundary";

export async function loader({ context }: LoaderFunctionArgs) {
  return context.get(assessmentCallsContext).coachAssessmentCalls.loadCalls();
}

export const meta: MetaFunction = () => [{ title: "Coach Workspace | Evoa" }];

export default function CoachHomeRoute() {
  const listing = useLoaderData<typeof loader>();
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);
  const calls = classifyCalls(listing.calls, { now, timeZone });
  const callsLeftToday = countCallsLeftToday(calls);

  return (
    <div className="w-full">
      <div data-parity-root="CoachGreeting">
        <PortalPageHeader
          subtitle={
            <span data-parity="today-count">
              You have {callsLeftToday} assessment call
              {callsLeftToday === 1 ? "" : "s"} today.
            </span>
          }
          title="Good morning, Coach."
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <UpcomingCallsWidget calls={calls} timeZone={timeZone} />
      </div>
    </div>
  );
}
