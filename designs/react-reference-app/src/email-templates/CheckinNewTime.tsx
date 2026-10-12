import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
  type CheckinEmailDetail,
} from './_checkinEmailLayout';

export type CheckinNewTimeProps = {
  who?: string;
  note?: string | null;
  earlierStartsAt?: Date;
  startsAt?: Date;
  timeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_EARLIER_STARTS_AT = new Date('2026-10-09T13:00:00.000Z');
const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — new time';
const HEADING = 'A new time for your check-in.';
const SUBHEAD = 'Here is who proposed it and when.';
const BUTTON_LABEL = 'Answer the proposal';
const FOOTER_LINE =
  'You received this email because a new time was proposed for one of your check-ins on the Evoa site.';

export function checkinNewTimeSubject(who: string): string {
  return `${who} proposed a new time for your check-in`;
}

export function CheckinNewTime({
  who = 'Eli',
  note,
  earlierStartsAt = DEFAULT_EARLIER_STARTS_AT,
  startsAt = DEFAULT_STARTS_AT,
  timeZone = 'Europe/London',
  checkinsUrl = '/portal/checkins',
}: CheckinNewTimeProps) {
  const details: CheckinEmailDetail[] = [
    { label: 'WHO', value: who },
    { label: 'EARLIER', value: formatCallMoment(earlierStartsAt, timeZone) },
    { label: 'NEW TIME', value: formatCallMoment(startsAt, timeZone) },
  ];
  if (note && note.trim().length > 0) {
    details.push({ label: 'NOTE', value: note });
  }

  return (
    <CheckinEmailLayout
      subject={checkinNewTimeSubject(who)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={SUBHEAD}
      details={details}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={checkinsUrl} label={BUTTON_LABEL} />
    </CheckinEmailLayout>
  );
}

CheckinNewTime.PreviewProps = {} satisfies CheckinNewTimeProps;

export default CheckinNewTime;
