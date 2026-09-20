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
import { CoachGreeting } from "~/features/assessment-calls/ui/coach/dashboard/coach-greeting";
import { UpcomingCallsWidget } from "~/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget";
import { useCoachClock } from "~/features/assessment-calls/ui/coach/use-coach-clock";

export async function loader({ context }: LoaderFunctionArgs) {
  return context.get(assessmentCallsContext).coachAssessmentCalls.loadCalls();
}

export const meta: MetaFunction = () => [{ title: "Coach Workspace | Evoa" }];

export default function CoachHomeRoute() {
  const listing = useLoaderData<typeof loader>();
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);
  const calls = classifyCalls(listing.calls, { now, timeZone });

  return (
    <div className="w-full pb-12">
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <CoachGreeting callsLeftToday={countCallsLeftToday(calls)} />
      </header>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <UpcomingCallsWidget calls={calls} timeZone={timeZone} />
      </div>
    </div>
  );
}
