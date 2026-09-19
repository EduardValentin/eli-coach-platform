import type { ReactNode } from "react";

import type { AppointmentTime } from "./appointment";

type DashboardAppointmentRowProps = {
  action: ReactNode;
  attendeeName: string;
  badges?: ReactNode;
  when: AppointmentTime;
};

export function DashboardAppointmentRow({
  action,
  attendeeName,
  badges,
  when,
}: DashboardAppointmentRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-border-default bg-surface-neutral/50 p-4 transition-all hover:bg-surface-base hover:shadow-card">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text-primary">
            {attendeeName}
          </p>
          {badges}
        </div>
        <p className="mt-0.5 text-xs text-text-muted">
          <span className="whitespace-nowrap">{when.date}</span> at{" "}
          <span className="whitespace-nowrap">{when.time}</span>
        </p>
      </div>
      {action}
    </div>
  );
}
