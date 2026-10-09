import { Mail, Phone, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DateTimeLabel } from '../DateTimeLabel';
import { LABEL_CLASS } from '../typography';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { getInitials } from '../../utils/clientHelpers';
import { formatShortDay, formatSlotTime } from '../../utils/dateFormatters';
import type {
  AppointmentAttendee,
  AppointmentDetail,
  AppointmentStatus,
  AppointmentTime,
  AppointmentTitleElement,
} from './appointment';

const CARD_CLASS =
  'flex flex-col md:flex-row md:items-start gap-4 p-5 rounded-card border border-border-subtle bg-card';

const CARD_TONE: Record<AppointmentStatus, string> = {
  scheduled: 'shadow-soft text-text-primary',
  past: 'text-muted-foreground',
};

function AttendeeAvatar({
  attendee,
  status,
}: {
  attendee: AppointmentAttendee;
  status: AppointmentStatus;
}) {
  return (
    <Avatar size="md" className={cn(status === 'past' && 'opacity-70')}>
      {attendee.imageUrl && <AvatarImage src={attendee.imageUrl} alt="" />}
      <AvatarFallback aria-hidden="true">
        {getInitials(attendee.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function formatAppointmentTime({ startsAt, timeZone }: AppointmentTime) {
  return `${formatShortDay(startsAt, timeZone)} · ${formatSlotTime(startsAt, timeZone)}`;
}

function RescheduledMarker({ from }: { from: AppointmentTime }) {
  const label = `Rescheduled from ${formatAppointmentTime(from)}`;

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex size-5 items-center justify-center self-center rounded-control text-text-secondary hover:text-text-primary"
      >
        <RefreshCw aria-hidden="true" size={12} />
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function AppointmentTimeRow({
  when,
  rescheduledFrom,
  label,
}: {
  when: AppointmentTime;
  rescheduledFrom?: AppointmentTime;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      <DateTimeLabel
        size="sm"
        startsAt={when.startsAt}
        timeZone={when.timeZone}
      />
      {rescheduledFrom && <RescheduledMarker from={rescheduledFrom} />}
      {label && (
        <span className="basis-full text-sm text-text-secondary sm:basis-auto">
          <span className="hidden sm:inline">· </span>
          {label}
        </span>
      )}
    </div>
  );
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

function AppointmentDetails({
  details,
}: {
  details: readonly AppointmentDetail[];
}) {
  if (details.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {details.map((detail, index) => (
        <div key={detail.label}>
          <dt className={LABEL_CLASS}>{detail.label}</dt>
          <dd
            className="mt-0.5 text-sm text-text-secondary"
            data-parity={`detail-${index + 1}`}
          >
            {detail.value}
          </dd>
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
  whenLabel,
  supersededWhen,
  rescheduledFrom,
  details = [],
  quote,
  quoteAuthor,
  quoteParity,
  footnote,
  actions,
  parityRoot,
}: {
  attendee: AppointmentAttendee;
  when: AppointmentTime;
  status?: AppointmentStatus;
  titleElement?: AppointmentTitleElement;
  badges?: ReactNode;
  whenLabel?: string;
  supersededWhen?: AppointmentTime;
  rescheduledFrom?: AppointmentTime;
  details?: readonly AppointmentDetail[];
  quote?: string;
  quoteAuthor?: string;
  quoteParity?: string;
  footnote?: string;
  actions?: ReactNode;
  parityRoot?: string;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className={cn(CARD_CLASS, CARD_TONE[status])}
      data-parity-root={parityRoot}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <AttendeeAvatar attendee={attendee} status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Title className="text-sm font-medium">{attendee.name}</Title>
            {badges}
          </div>

          {supersededWhen && (
            <s className="mb-0.5 block text-xs text-text-secondary">
              {formatAppointmentTime(supersededWhen)}
            </s>
          )}

          <AppointmentTimeRow
            when={when}
            rescheduledFrom={rescheduledFrom}
            label={whenLabel}
          />

          <AttendeeContactRow attendee={attendee} />

          <AppointmentDetails details={details} />

          {quote && (
            <p
              className="text-xs text-text-secondary italic mt-2 whitespace-pre-line"
              data-parity={quoteParity}
            >
              {quoteAuthor && (
                <span className="not-italic font-medium">{quoteAuthor}: </span>
              )}
              "{quote}"
            </p>
          )}

          {footnote && (
            <p className="text-xs text-text-secondary mt-1.5">{footnote}</p>
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
