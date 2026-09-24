import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { LABEL_CLASS } from "../lib/typography";
import { Avatar } from "../primitives/avatar";
import { DateTimeLabel } from "../primitives/date-time-label";
import type {
  AppointmentAttendee,
  AppointmentDetail,
  AppointmentStatus,
  AppointmentTime,
  AppointmentTitleElement,
} from "./appointment";

const CONTACT_GLYPH_SIZE = 13;

const CARD_TONE: Record<AppointmentStatus, string> = {
  past: "text-text-muted",
  scheduled: "shadow-soft text-text-primary",
};

const AVATAR_TONE = {
  past: "muted",
  scheduled: "quiet",
} as const;

const CONTACT_LINK_CLASS_NAME =
  "inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline";

function AttendeeContactRow({ attendee }: { attendee: AppointmentAttendee }) {
  if (!attendee.email && !attendee.phone) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      {attendee.email && (
        <a
          className={CONTACT_LINK_CLASS_NAME}
          href={`mailto:${attendee.email}`}
        >
          <Mail
            aria-hidden="true"
            className="shrink-0"
            size={CONTACT_GLYPH_SIZE}
          />
          <span className="min-w-0 truncate" title={attendee.email}>
            {attendee.email}
          </span>
        </a>
      )}
      {attendee.phone && (
        <a className={CONTACT_LINK_CLASS_NAME} href={`tel:${attendee.phone}`}>
          <Phone
            aria-hidden="true"
            className="shrink-0"
            size={CONTACT_GLYPH_SIZE}
          />
          <span className="min-w-0 truncate">{attendee.phone}</span>
        </a>
      )}
    </div>
  );
}

function AppointmentDetails({
  details,
}: {
  details: ReadonlyArray<AppointmentDetail>;
}) {
  if (details.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {details.map((detail) => (
        <div key={detail.label}>
          <dt className={LABEL_CLASS}>{detail.label}</dt>
          <dd className="mt-0.5 text-sm text-text-secondary">{detail.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type AppointmentCardProps = {
  actions?: ReactNode;
  attendee: AppointmentAttendee;
  badges?: ReactNode;
  details?: ReadonlyArray<AppointmentDetail>;
  quote?: string;
  status?: AppointmentStatus;
  titleElement?: AppointmentTitleElement;
  when: AppointmentTime;
};

export function AppointmentCard({
  actions,
  attendee,
  badges,
  details = [],
  quote,
  status = "scheduled",
  titleElement: Title = "p",
  when,
}: AppointmentCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-5 md:flex-row md:items-start",
        CARD_TONE[status],
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Avatar name={attendee.name} size="md" tone={AVATAR_TONE[status]} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Title className="text-sm font-medium">{attendee.name}</Title>
            {badges}
          </div>

          <DateTimeLabel size="sm" when={when} />

          <AttendeeContactRow attendee={attendee} />

          <AppointmentDetails details={details} />

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
