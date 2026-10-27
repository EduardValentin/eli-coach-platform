import {
  DashboardAppointmentRow,
  RowActionLink,
} from "~/shared/design-system/appointments";
import { cn } from "~/shared/design-system/lib";
import { PortalWidget, WidgetLink } from "~/shared/design-system/portal";
import { ClipboardCheck } from "lucide-react";
import { useId } from "react";

import type { CoachCheckIns } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import {
  COACH_CHECK_INS_PATH,
  coachCheckInPath,
} from "~/bounded-contexts/clients/check-ins/public/paths";
import { checkInMomentOf } from "~/bounded-contexts/clients/check-ins/ui/shared/check-ins/check-in-listing";

const CHECK_INS_ON_THE_DASHBOARD = 3;

type PendingCheckInsWidgetProps = {
  checkIns: CoachCheckIns["checkIns"];
  timeZone: string;
};

export function PendingCheckInsWidget({
  checkIns,
  timeZone,
}: PendingCheckInsWidgetProps) {
  const headingId = useId();
  const soonest = checkIns.slice(0, CHECK_INS_ON_THE_DASHBOARD);
  const isEmpty = soonest.length === 0;

  return (
    <PortalWidget
      className="flex h-full flex-col"
      data-parity-root="PendingCheckIns"
      footer={
        <WidgetLink to={COACH_CHECK_INS_PATH} trailing="arrow">
          View all check-ins
        </WidgetLink>
      }
      headingId={headingId}
      icon={ClipboardCheck}
      title="Pending Check-ins"
    >
      <div
        className={cn("flex-1", {
          "flex items-center justify-center": isEmpty,
        })}
      >
        {isEmpty ? (
          <p className="text-sm text-text-muted">No pending check-ins.</p>
        ) : (
          <ul className="space-y-4">
            {soonest.map((checkIn) => (
              <li key={checkIn.id}>
                <DashboardAppointmentRow
                  action={
                    <RowActionLink
                      icon={ClipboardCheck}
                      to={coachCheckInPath(checkIn.id)}
                    >
                      Review
                    </RowActionLink>
                  }
                  attendeeName={`${checkIn.client.firstName} ${checkIn.client.lastName}`}
                  when={checkInMomentOf(checkIn.startsAt, timeZone)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalWidget>
  );
}
