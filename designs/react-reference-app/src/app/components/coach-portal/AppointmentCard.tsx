import { Mail, Phone } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { DateTimeLabel } from '../DateTimeLabel';
import { cn } from '../ui/utils';
import type {
  AppointmentAttendee,
  AppointmentDetail,
  AppointmentStatus,
  AppointmentTime,
  AppointmentTitleElement,
} from './appointment';

const CARD_CLASS =
  'flex flex-col md:flex-row md:items-start gap-4 p-5 rounded-card border border-neutral-100/50 bg-card';

const CARD_TONE: Record<AppointmentStatus, string> = {
  scheduled: 'shadow-soft text-text-primary',
  past: 'text-muted-foreground',
};

const AVATAR_CLASS = 'w-11 h-11 rounded-full border border-neutral-200 shrink-0';

const AVATAR_INITIAL_CLASS =
  'flex items-center justify-center font-serif text-sm font-semibold';

const AVATAR_TONE: Record<AppointmentStatus, string> = {
  scheduled: 'bg-neutral-100 text-text-primary',
  past: 'bg-muted text-muted-foreground',
};

function AttendeeAvatar({
  attendee,
  status,
}: {
  attendee: AppointmentAttendee;
  status: AppointmentStatus;
}) {
  if (attendee.imageUrl) {
    return (
      <img
        src={attendee.imageUrl}
        alt=""
        className={cn(AVATAR_CLASS, 'object-cover')}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(AVATAR_CLASS, AVATAR_INITIAL_CLASS, AVATAR_TONE[status])}
    >
      {attendee.name.charAt(0)}
    </div>
  );
}

function AppointmentTimeRow({ when }: { when: AppointmentTime }) {
  return <DateTimeLabel startsAt={when.startsAt} timeZone={when.timeZone} />;
}

const CONTACT_LINK_CLASS =
  'inline-flex max-w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline';

function AttendeeEmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className={CONTACT_LINK_CLASS}>
      <Mail aria-hidden="true" size={13} className="shrink-0" />
      <span className="min-w-0 truncate" title={email}>
        {email}
      </span>
    </a>
  );
}

function AttendeePhoneLink({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone}`} className={CONTACT_LINK_CLASS}>
      <Phone aria-hidden="true" size={13} className="shrink-0" />
      <span className="min-w-0 truncate">{phone}</span>
    </a>
  );
}

function AttendeeContactRow({ attendee }: { attendee: AppointmentAttendee }) {
  if (!attendee.email && !attendee.phone) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      {attendee.email && <AttendeeEmailLink email={attendee.email} />}
      {attendee.phone && <AttendeePhoneLink phone={attendee.phone} />}
    </div>
  );
}

function AppointmentDetails({ details }: { details: readonly AppointmentDetail[] }) {
  if (details.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {details.map((detail) => (
        <div key={detail.label}>
          <dt className="font-semibold uppercase tracking-wider text-text-muted">
            {detail.label}
          </dt>
          <dd className="mt-0.5 text-text-secondary">{detail.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AppointmentCard({
  attendee,
  when,
  status = 'scheduled',
  titleElement: Title = 'p',
  badges,
  supersededWhen,
  details = [],
  quote,
  footnote,
  actions,
}: {
  attendee: AppointmentAttendee;
  when: AppointmentTime;
  status?: AppointmentStatus;
  titleElement?: AppointmentTitleElement;
  badges?: ReactNode;
  supersededWhen?: AppointmentTime;
  details?: readonly AppointmentDetail[];
  quote?: string;
  footnote?: string;
  actions?: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className={cn(CARD_CLASS, CARD_TONE[status])}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <AttendeeAvatar attendee={attendee} status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Title className="text-sm font-semibold">{attendee.name}</Title>
            {badges}
          </div>

          {supersededWhen && (
            <div className="text-xs text-text-secondary line-through mb-0.5">
              <DateTimeLabel
                startsAt={supersededWhen.startsAt}
                timeZone={supersededWhen.timeZone}
              />
            </div>
          )}

          <AppointmentTimeRow when={when} />

          <AttendeeContactRow attendee={attendee} />

          <AppointmentDetails details={details} />

          {quote && (
            <p className="text-xs text-text-secondary italic mt-2 whitespace-pre-line">
              "{quote}"
            </p>
          )}

          {footnote && (
            <p className="text-[10px] text-text-secondary mt-1.5">{footnote}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-col gap-2 w-full md:flex-row md:flex-wrap md:w-auto md:shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
