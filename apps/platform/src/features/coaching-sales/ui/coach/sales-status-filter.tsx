import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";

import { COACH_CALLS_PAGE_PARAM } from "~/features/assessment-calls/contracts/paths";
import {
  CALL_SALES_STATES,
  type CallSalesState,
} from "~/features/coaching-sales/contracts/coaching-sales";

import { CALL_SALES_STATE_LABELS } from "./call-sales-state-labels";

export const SALES_STATUS_PARAM = "status";

export type CallSalesFilter = "any" | CallSalesState;

const ANY_SALES_FILTER = "any";

const SALES_FILTERS: readonly CallSalesFilter[] = [
  ANY_SALES_FILTER,
  ...CALL_SALES_STATES,
];

const SALES_FILTER_LABELS: Record<CallSalesFilter, string> = {
  any: "All statuses",
  ...CALL_SALES_STATE_LABELS,
};

type SalesStateOf<Call> = (call: Call) => CallSalesState | null;

export function toSalesFilter(raw: string | null): CallSalesFilter {
  return SALES_FILTERS.find((filter) => filter === raw) ?? ANY_SALES_FILTER;
}

function salesFilterLabel(filter: CallSalesFilter): string {
  return SALES_FILTER_LABELS[filter];
}

export function matchesSalesFilter(
  filter: CallSalesFilter,
  state: CallSalesState | null,
): boolean {
  return filter === ANY_SALES_FILTER || state === filter;
}

export function countsBySalesFilter<Call>(
  calls: readonly Call[],
  salesStateOf: SalesStateOf<Call>,
): Record<CallSalesFilter, number> {
  const countFor = (filter: CallSalesFilter) =>
    calls.filter((call) => matchesSalesFilter(filter, salesStateOf(call)))
      .length;

  return {
    any: countFor("any"),
    held: countFor("held"),
    "payment-link-sent": countFor("payment-link-sent"),
    paid: countFor("paid"),
  };
}

export function useSalesFilterParam() {
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();

  const chooseFilter = (value: string) => {
    const chosen = toSalesFilter(value);

    replaceSearchParams((params) => {
      params.delete(COACH_CALLS_PAGE_PARAM);

      if (chosen === ANY_SALES_FILTER) {
        params.delete(SALES_STATUS_PARAM);
        return;
      }

      params.set(SALES_STATUS_PARAM, chosen);
    });
  };

  const filter = toSalesFilter(searchParams.get(SALES_STATUS_PARAM));

  return {
    chooseFilter,
    filter,
    isActive: filter !== ANY_SALES_FILTER,
    label: salesFilterLabel(filter),
  };
}

type SalesStatusFilterProps<Call> = {
  onChange: (value: string) => void;
  salesStateOf: SalesStateOf<Call>;
  scopedCalls: readonly Call[];
  value: CallSalesFilter;
};

export function SalesStatusFilter<Call>({
  onChange,
  salesStateOf,
  scopedCalls,
  value,
}: SalesStatusFilterProps<Call>) {
  const counts = countsBySalesFilter(scopedCalls, salesStateOf);

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger aria-label="Status" data-parity="status-filter" size="sm">
        <SelectValue>{salesFilterLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SALES_FILTERS.map((filter) => (
          <SelectItem
            count={counts[filter]}
            countParity={`status-count-${filter}`}
            key={filter}
            value={filter}
          >
            {salesFilterLabel(filter)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
