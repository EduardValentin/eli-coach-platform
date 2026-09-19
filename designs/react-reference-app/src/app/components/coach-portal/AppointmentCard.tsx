import { CalendarDays, Clock, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type AppointmentStatus = 'scheduled' | 'past';

export type AppointmentAttendee = {
  name: string;
  imageUrl?: string;
  email?: string;
};

export type AppointmentTime = { date: string; time: string };

export type AppointmentTitleElement = 'p' | 'h2' | 'h3';

const CARD_CLASS =
  'flex items-start gap-4 p-5 rounded-card border border-neutral-100/50 bg-card';

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
  return (
    <div className="flex items-center gap-3 flex-wrap text-sm text-text-secondary">
      <span className="flex items-center gap-1.5">
        <CalendarDays aria-hidden="true" size={13} className="shrink-0" />
        {when.date}
      </span>
      <span className="flex items-center gap-1.5">
        <Clock aria-hidden="true" size={13} className="shrink-0" />
        {when.time}
      </span>
    </div>
  );
}

function AttendeeEmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline"
    >
      <Mail aria-hidden="true" size={13} className="shrink-0" />
      <span className="wrap-anywhere">{email}</span>
    </a>
  );
}

export function AppointmentCard({
  attendee,
  when,
  status = 'scheduled',
  titleElement: Title = 'p',
  badges,
  supersededWhen,
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
      <AttendeeAvatar attendee={attendee} status={status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Title className="text-sm font-semibold">{attendee.name}</Title>
          {badges}
        </div>

        {supersededWhen && (
          <div className="flex items-center gap-2 text-xs text-text-secondary line-through mb-0.5">
            <CalendarDays aria-hidden="true" size={12} className="shrink-0" />
            {supersededWhen.date} at {supersededWhen.time}
          </div>
        )}

        <AppointmentTimeRow when={when} />

        {attendee.email && <AttendeeEmailLink email={attendee.email} />}

        {quote && (
          <p className="text-xs text-text-secondary italic mt-2 whitespace-pre-line">
            "{quote}"
          </p>
        )}

        {footnote && (
          <p className="text-[10px] text-text-secondary mt-1.5">{footnote}</p>
        )}
      </div>

      {actions && <div className="flex gap-2 shrink-0 flex-wrap">{actions}</div>}
    </motion.div>
  );
}
