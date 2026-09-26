import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  classifyCalls,
  haveOnlyListingParamsChanged,
  isEndedCall,
  type ClassifiedCall,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { AssessmentCallsSection } from "~/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section";
import { useCoachClock } from "~/features/assessment-calls/ui/coach/use-coach-clock";
import type { CallSalesState } from "~/features/coaching-sales/contracts/coaching-sales";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { CallSalesStateBadge } from "~/features/coaching-sales/ui/coach/call-sales-state-badge";
import { PaymentLinkAction } from "~/features/coaching-sales/ui/coach/payment-link-action";
import {
  matchesSalesFilter,
  SalesStatusFilter,
  SALES_STATUS_PARAM,
  useSalesFilterParam,
} from "~/features/coaching-sales/ui/coach/sales-status-filter";

export { AssessmentCallsErrorBoundary as ErrorBoundary } from "~/features/assessment-calls/ui/coach/assessment-calls-error-boundary";

export async function loader({ context }: LoaderFunctionArgs) {
  const listing = await context
    .get(assessmentCallsContext)
    .coachAssessmentCalls.loadCalls();
  const endedCallIds = classifyCalls(listing.calls, {
    now: new Date(listing.now),
    timeZone: listing.coachTimeZone,
  })
    .filter(isEndedCall)
    .map((call) => call.id);
  const salesStates = await context
    .get(coachingSalesContext)
    .coachSales.loadSalesStates(endedCallIds);

  return { ...listing, salesStates };
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyListingParamsChanged(currentUrl, nextUrl, [SALES_STATUS_PARAM])
    ? false
    : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [{ title: "Assessment Calls | Evoa" }];

export default function CoachAssessmentCallsRoute() {
  const listing = useLoaderData<typeof loader>();
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);
  const salesFilter = useSalesFilterParam();
  const endedCallState = (call: ClassifiedCall): CallSalesState =>
    listing.salesStates[call.id] ?? "held";
  const salesStateOf = (call: ClassifiedCall): CallSalesState | null =>
    isEndedCall(call) ? endedCallState(call) : null;

  return (
    <div className="w-full">
      <div data-parity-root="CoachAssessmentCallsHeader">
        <PortalPageHeader
          subtitle="Everyone who booked a call with you."
          title="Assessment calls"
        />
      </div>

      <AssessmentCallsSection
        calls={listing.calls}
        now={now}
        renderEndedCallExtras={(call) => {
          const state = endedCallState(call);

          return {
            action: <PaymentLinkAction call={call} state={state} />,
            badge: <CallSalesStateBadge state={state} />,
          };
        }}
        timeZone={timeZone}
        toolbarFilter={{
          control: (scopedCalls) => (
            <SalesStatusFilter
              onChange={salesFilter.chooseFilter}
              salesStateOf={salesStateOf}
              scopedCalls={scopedCalls}
              value={salesFilter.filter}
            />
          ),
          isActive: salesFilter.isActive,
          label: salesFilter.label,
          matches: (call) =>
            matchesSalesFilter(salesFilter.filter, salesStateOf(call)),
          params: [SALES_STATUS_PARAM],
        }}
      />
    </div>
  );
}
