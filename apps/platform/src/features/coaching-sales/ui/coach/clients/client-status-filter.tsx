import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";

import {
  CLIENT_STATUS_GROUPS,
  CLIENT_STATUS_LABELS,
} from "~/features/coaching-sales/contracts/client-status";

import { ALL_STATUSES_OPTION, type RosterStatusOption } from "./roster-listing";

const ALL_STATUSES_LABEL = "All statuses";

type ClientStatusFilterProps = {
  counts: Record<RosterStatusOption, number>;
  onChoose: (value: string) => void;
  status: RosterStatusOption;
};

function statusOptionLabel(option: RosterStatusOption): string {
  return option === ALL_STATUSES_OPTION
    ? ALL_STATUSES_LABEL
    : CLIENT_STATUS_LABELS[option];
}

export function ClientStatusFilter({
  counts,
  onChoose,
  status,
}: ClientStatusFilterProps) {
  return (
    <Select onValueChange={onChoose} value={status}>
      <SelectTrigger
        aria-label="Status"
        className="w-full sm:w-56"
        data-parity="status-filter"
        size="sm"
      >
        <SelectValue>{statusOptionLabel(status)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          count={counts[ALL_STATUSES_OPTION]}
          countParity="status-count-all"
          value={ALL_STATUSES_OPTION}
        >
          {ALL_STATUSES_LABEL}
        </SelectItem>
        <SelectSeparator data-parity="status-separator" />
        {CLIENT_STATUS_GROUPS.map((group) => (
          <SelectGroup
            data-parity={`status-group-${group.label.toLowerCase()}`}
            key={group.label}
          >
            <SelectLabel>{group.label}</SelectLabel>
            {group.statuses.map((option) => (
              <SelectItem count={counts[option]} key={option} value={option}>
                {CLIENT_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
