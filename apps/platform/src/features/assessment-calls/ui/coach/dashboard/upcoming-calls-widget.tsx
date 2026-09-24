import { DashboardAppointmentRow } from "@eli-coach-platform/ui/appointments";
import { cn } from "@eli-coach-platform/ui/lib";
import { PortalWidget, WidgetLink } from "@eli-coach-platform/ui/portal";
import { Badge } from "@eli-coach-platform/ui/primitives";
import { Video } from "lucide-react";
import { useId } from "react";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/contracts/call-moment";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";
import {
  upcomingCalls,
  type ClassifiedCall,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

const CALLS_ON_THE_DASHBOARD = 3;

type UpcomingCallsWidgetProps = {
  calls: readonly ClassifiedCall[];
  timeZone: string;
};

export function UpcomingCallsWidget({
  calls,
  timeZone,
}: UpcomingCallsWidgetProps) {
  const headingId = useId();
  const soonest = upcomingCalls(calls, CALLS_ON_THE_DASHBOARD);
  const isEmpty = soonest.length === 0;

  return (
    <div data-parity-root="UpcomingCallsWidget">
      <PortalWidget
        className="flex h-full flex-col"
        footer={
          <WidgetLink arrow to={COACH_ASSESSMENT_CALLS_PATH}>
            View all calls
          </WidgetLink>
        }
        headingId={headingId}
        icon={
          <Video
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        title="Upcoming calls"
      >
        <div
          className={cn("flex-1", {
            "flex items-center justify-center": isEmpty,
          })}
        >
          {isEmpty ? (
            <p className="text-sm text-text-muted">No upcoming calls.</p>
          ) : (
            <ul className="space-y-4">
              {soonest.map((call) => (
                <li key={call.id}>
                  <DashboardAppointmentRow
                    action={
                      <JoinCallLink
                        joinPath={call.joinPath}
                        live={call.isToday}
                      />
                    }
                    attendeeName={call.fullName}
                    badges={
                      call.isToday && (
                        <Badge tone="brand-secondary">Today</Badge>
                      )
                    }
                    when={{
                      date: formatShortDay(new Date(call.startsAt), timeZone),
                      time: formatClockTime(new Date(call.startsAt), timeZone),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PortalWidget>
    </div>
  );
}
