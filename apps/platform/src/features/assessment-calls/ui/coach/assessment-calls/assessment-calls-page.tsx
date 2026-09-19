import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { nameTimeZone } from "~/features/assessment-calls/contracts/call-moment";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import { haveOnlyListingParamsChanged } from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { useCoachClock } from "~/features/assessment-calls/ui/coach/use-coach-clock";

import { AssessmentCallsSection } from "./assessment-calls-section";

export async function loader({ context }: LoaderFunctionArgs) {
  return context.get(assessmentCallsContext).coachAssessmentCalls.loadCalls();
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyListingParamsChanged(currentUrl, nextUrl)
    ? false
    : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [{ title: "Assessment Calls | Evoa" }];

export default function CoachAssessmentCallsRoute() {
  const listing = useLoaderData<typeof loader>();
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);

  return (
    <div className="mx-auto max-w-4xl pb-12 lg:px-8 lg:pt-8">
      <header className="mb-8" data-parity-root="CoachAssessmentCallsHeader">
        <h1 className="font-heading text-3xl font-medium text-text-primary lg:text-4xl">
          Assessment calls
        </h1>
        <p className="mt-2 text-text-secondary">
          Times in {nameTimeZone(now, timeZone)}
        </p>
      </header>

      <AssessmentCallsSection
        calls={listing.calls}
        now={now}
        timeZone={timeZone}
      />
    </div>
  );
}
