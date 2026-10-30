import type { AppointmentDetail } from "~/shared/design-system/appointments";
import { haveOnlyListingParamsChanged } from "~/shared/design-system/lib";
import { PortalPageHeader } from "~/shared/design-system/portal";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { assessmentCallsContext } from "~/bounded-contexts/scheduling/public/request-context";
import {
  isEndedCall,
  LISTING_PARAMS,
  type ClassifiedCall,
} from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/assessment-call-listing";
import { AssessmentCallsSection } from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/assessment-calls/assessment-calls-section";
import { useCoachClock } from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/use-coach-clock";
import { ViewClientLink } from "~/bounded-contexts/clients/clients/ui/coach/clients/view-client-link";
import type { CallSalesState } from "~/bounded-contexts/sales/coaching-sales/public/coaching-sales";
import { coachingSalesContext } from "~/bounded-contexts/sales/public/request-context";
import { CallSalesStateBadge } from "~/bounded-contexts/sales/coaching-sales/ui/coach/call-sales/call-sales-state-badge";
import { PaymentLinkAction } from "~/bounded-contexts/sales/coaching-sales/ui/coach/call-sales/payment-link-action";
import {
  PRICING_DETAIL_LABEL,
  pricingTierLabel,
} from "~/bounded-contexts/sales/coaching-sales/ui/coach/call-sales/pricing-tier-label";
import {
  matchesSalesFilter,
  SalesStatusFilter,
  SALES_STATUS_PARAM,
  useSalesFilterParam,
} from "~/bounded-contexts/sales/coaching-sales/ui/coach/call-sales/sales-status-filter";

export { AssessmentCallsErrorBoundary as ErrorBoundary } from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/assessment-calls-error-boundary";

export async function loader({ context }: LoaderFunctionArgs) {
  const listing = await context
    .get(assessmentCallsContext)
    .coachAssessmentCallsController.loadCalls();
  const { coachSalesController } = context.get(coachingSalesContext);
  const [callSales, pricingTiers] = await Promise.all([
    coachSalesController.loadCallSales(listing.calls.map((call) => call.id)),
    coachSalesController.loadPricingTiers(
      listing.calls.map((call) => ({ email: call.visitorEmail, id: call.id })),
    ),
  ]);

  return { ...listing, pricingTiers, callSales };
}

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyListingParamsChanged(currentUrl, nextUrl, [
    ...LISTING_PARAMS,
    SALES_STATUS_PARAM,
  ])
    ? false
    : defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [{ title: "Assessment Calls | Evoa" }];

export default function CoachAssessmentCallsRoute() {
  const listing = useLoaderData<typeof loader>();
  const { now, timeZone } = useCoachClock(listing.now, listing.coachTimeZone);
  const salesFilter = useSalesFilterParam();
  const salesStateOf = (call: ClassifiedCall): CallSalesState | null =>
    isEndedCall(call) ? listing.callSales[call.id].state : null;
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
          const { clientId, state } = listing.callSales[call.id];

          return {
            action: clientId ? (
              <ViewClientLink clientId={clientId} />
            ) : (
              <PaymentLinkAction call={call} state={state} />
            ),
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
