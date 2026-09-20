import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Avatar } from "../primitives/avatar";
import type {
  AppointmentAttendee,
  AppointmentStatus,
  AppointmentTime,
  AppointmentTitleElement,
} from "./appointment";
import { CalendarDaysGlyph, ClockGlyph, MailGlyph } from "./appointment-glyphs";

const CARD_TONE: Record<AppointmentStatus, string> = {
  past: "text-text-muted",
  scheduled: "shadow-soft text-text-primary",
};

const AVATAR_TONE = {
  past: "muted",
  scheduled: "quiet",
} as const;

type AppointmentCardProps = {
  actions?: ReactNode;
  attendee: AppointmentAttendee;
  badges?: ReactNode;
  quote?: string;
  status?: AppointmentStatus;
  titleElement?: AppointmentTitleElement;
  when: AppointmentTime;
};

export function AppointmentCard({
  actions,
  attendee,
  badges,
  quote,
  status = "scheduled",
  titleElement: Title = "p",
  when,
}: AppointmentCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border border-stroke-faint/50 bg-surface-base p-5 md:flex-row md:items-start",
        CARD_TONE[status],
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Avatar name={attendee.name} tone={AVATAR_TONE[status]} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Title className="text-sm font-semibold">{attendee.name}</Title>
            {badges}
          </div>

          <div className="flex flex-col gap-1 text-sm text-text-secondary md:flex-row md:flex-wrap md:items-center md:gap-3">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CalendarDaysGlyph />
              {when.date}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ClockGlyph />
              {when.time}
            </span>
          </div>

          {attendee.email && (
            <a
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline"
              href={`mailto:${attendee.email}`}
            >
              <MailGlyph />
              <span className="min-w-0 truncate" title={attendee.email}>
                {attendee.email}
              </span>
            </a>
          )}

          {quote && (
            <p className="mt-2 text-xs text-text-secondary italic whitespace-pre-line">
              &quot;{quote}&quot;
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex w-full flex-col gap-2 md:w-auto md:shrink-0 md:flex-row md:flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
