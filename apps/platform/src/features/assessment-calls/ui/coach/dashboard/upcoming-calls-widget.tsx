import { DashboardAppointmentRow } from "@eli-coach-platform/ui/appointments";
import { cn } from "@eli-coach-platform/ui/lib";
import { Badge, cardVariants } from "@eli-coach-platform/ui/primitives";
import { ArrowRight, Video } from "lucide-react";
import { Link } from "react-router";

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
  const soonest = upcomingCalls(calls, CALLS_ON_THE_DASHBOARD);
  const isEmpty = soonest.length === 0;

  return (
    <div
      className={cn(
        cardVariants({ variant: "portal-panel" }),
        "flex h-full flex-col p-8",
      )}
      data-parity-root="UpcomingCallsWidget"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary">
          <Video aria-hidden="true" size={20} />
        </div>
        <h2 className="font-heading text-xl font-semibold text-text-primary">
          Upcoming calls
        </h2>
      </div>

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
                  action={<JoinCallLink joinPath={call.joinPath} />}
                  attendeeName={call.visitorName}
                  badges={call.isToday && <Badge tone="accent">Today</Badge>}
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

      <Link
        className="mt-auto inline-flex items-center gap-2 self-start pt-6 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary"
        to={COACH_ASSESSMENT_CALLS_PATH}
      >
        View all calls
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </div>
  );
}
