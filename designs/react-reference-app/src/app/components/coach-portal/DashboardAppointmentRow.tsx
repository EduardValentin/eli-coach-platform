import type { ReactNode } from 'react';
import { DateTimeLabel } from '../DateTimeLabel';
import type { AppointmentTime } from './appointment';

export function DashboardAppointmentRow({
  attendeeName,
  when,
  badges,
  action,
}: {
  attendeeName: string;
  when: AppointmentTime;
  badges?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-card border border-border bg-muted/50 hover:bg-card hover:shadow-card transition-all">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-foreground">{attendeeName}</p>
          {badges}
        </div>
        <div className="mt-0.5">
          <DateTimeLabel startsAt={when.startsAt} timeZone={when.timeZone} />
        </div>
      </div>
      {action}
    </div>
  );
}
