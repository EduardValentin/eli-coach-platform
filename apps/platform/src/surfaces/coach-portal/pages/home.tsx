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
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import { PendingCheckInsWidget } from "~/features/check-ins/ui/coach/dashboard/pending-check-ins-widget";

export { AssessmentCallsErrorBoundary as ErrorBoundary } from "~/features/assessment-calls/ui/coach/assessment-calls-error-boundary";

export async function loader(args: LoaderFunctionArgs) {
  const [listing, pendingCheckIns] = await Promise.all([
    args.context.get(assessmentCallsContext).coachAssessmentCalls.loadCalls(),
    args.context.get(checkInsContext).coachCheckIns.loadAwaiting(args),
  ]);

  return { listing, pendingCheckIns };
}

export const meta: MetaFunction = () => [{ title: "Coach Workspace | Evoa" }];

export default function CoachHomeRoute() {
  const { listing, pendingCheckIns } = useLoaderData<typeof loader>();
  const checkInsToReview = pendingCheckIns.checkIns.length;
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);
  const calls = classifyCalls(listing.calls, { now, timeZone });
  const callsLeftToday = countCallsLeftToday(calls);

  return (
    <div className="w-full">
      <div data-parity-root="CoachGreeting">
        <PortalPageHeader
          subtitle={
            <>
              <span data-parity="today-count">
                You have {callsLeftToday} assessment call
                {callsLeftToday === 1 ? "" : "s"} today.
              </span>
              <span data-parity="review-count">
                {" "}
                {checkInsToReview} check-in
                {checkInsToReview === 1 ? "" : "s"} to review.
              </span>
            </>
          }
          title="Good morning, Eli."
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <UpcomingCallsWidget calls={calls} timeZone={timeZone} />
        <PendingCheckInsWidget
          checkIns={pendingCheckIns.checkIns}
          timeZone={timeZone}
        />
      </div>
    </div>
  );
}
