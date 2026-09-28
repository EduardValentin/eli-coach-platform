import type { AppointmentDetail } from "@eli-coach-platform/ui/appointments";
import { PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  haveOnlyListingParamsChanged,
  isEndedCall,
  type ClassifiedCall,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { AssessmentCallsSection } from "~/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section";
import { useCoachClock } from "~/features/assessment-calls/ui/coach/use-coach-clock";
import type { CallSalesState } from "~/features/coaching-sales/contracts/coaching-sales";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import { CallSalesStateBadge } from "~/features/coaching-sales/ui/coach/call-sales/call-sales-state-badge";
import { PaymentLinkAction } from "~/features/coaching-sales/ui/coach/call-sales/payment-link-action";
import {
  PRICING_DETAIL_LABEL,
  pricingTierLabel,
} from "~/features/coaching-sales/ui/coach/call-sales/pricing-tier-label";
import {
  matchesSalesFilter,
  SalesStatusFilter,
  SALES_STATUS_PARAM,
  useSalesFilterParam,
} from "~/features/coaching-sales/ui/coach/call-sales/sales-status-filter";

export { AssessmentCallsErrorBoundary as ErrorBoundary } from "~/features/assessment-calls/ui/coach/assessment-calls-error-boundary";

export async function loader({ context }: LoaderFunctionArgs) {
  const listing = await context
    .get(assessmentCallsContext)
    .coachAssessmentCalls.loadCalls();
  const { coachSales } = context.get(coachingSalesContext);
  const [salesStates, pricingTiers] = await Promise.all([
    coachSales.loadSalesStates(listing.calls.map((call) => call.id)),
    coachSales.loadPricingTiers(
      listing.calls.map((call) => ({ email: call.visitorEmail, id: call.id })),
    ),
  ]);

  return { ...listing, pricingTiers, salesStates };
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
  const salesStateOf = (call: ClassifiedCall): CallSalesState | null =>
    isEndedCall(call) ? listing.salesStates[call.id] : null;
  const pricingDetails = (call: ClassifiedCall): AppointmentDetail[] => {
    const tier = listing.pricingTiers[call.id];

    return tier
      ? [{ label: PRICING_DETAIL_LABEL, value: pricingTierLabel(tier) }]
      : [];
  };

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
        extraDetails={pricingDetails}
        now={now}
        renderEndedCallExtras={(call) => {
          const state = listing.salesStates[call.id];

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
