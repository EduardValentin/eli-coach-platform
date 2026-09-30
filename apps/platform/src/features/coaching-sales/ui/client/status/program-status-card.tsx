import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { ClipboardList } from "lucide-react";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/features/coaching-sales/ui/shared/calendar-day-format";

import {
  PROGRAM_STATUS_EYEBROW,
  PROGRAM_STATUS_LABEL,
  programStatusLine,
} from "./program-status-copy";

type ProgramStatusCardProps = {
  status: ProgramStatus;
};

export function ProgramStatusCard({ status }: ProgramStatusCardProps) {
  const timeZone = useCalendarDayTimeZone();
  const workStartDay = status.workStartsOn
    ? formatDayMonth(status.workStartsOn, timeZone)
    : null;

  return (
    <div
      className="mb-8"
      data-parity="program-status"
      data-parity-root="ProgramStatusCard"
    >
      <PortalWidget
        headingId="program-status-heading"
        icon={
          <ClipboardList
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        title={
          <span data-parity="status-eyebrow">{PROGRAM_STATUS_EYEBROW}</span>
        }
        voice={<span data-parity="status-label">{PROGRAM_STATUS_LABEL}</span>}
      >
        <p
          className="mt-1 max-w-2xl text-sm text-text-secondary"
          data-parity="status-line"
        >
          {programStatusLine(workStartDay)}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row" />
      </PortalWidget>
    </div>
  );
}
