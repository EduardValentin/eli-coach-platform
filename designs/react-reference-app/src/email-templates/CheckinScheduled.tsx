import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
  type CheckinEmailDetail,
} from './_checkinEmailLayout';

export type CheckinScheduledProps = {
  coachName?: string;
  note?: string | null;
  startsAt?: Date;
  clientTimeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — new request';
const BUTTON_LABEL = 'Answer the request';
const FOOTER_LINE =
  'You received this email because your coach scheduled a check-in with you on the Evoa site.';

export function checkinScheduledSubject(coachName: string): string {
  return `${coachName} scheduled a check-in with you`;
}

export function CheckinScheduled({
  coachName = 'Eli',
  note,
  startsAt = DEFAULT_STARTS_AT,
  clientTimeZone = 'Europe/London',
  checkinsUrl = '/portal/checkins',
}: CheckinScheduledProps) {
  const details: CheckinEmailDetail[] = [
    { label: 'WHEN', value: formatCallMoment(startsAt, clientTimeZone) },
  ];
  if (note && note.trim().length > 0) {
    details.push({ label: 'NOTE', value: note });
  }

  return (
    <CheckinEmailLayout
      subject={checkinScheduledSubject(coachName)}
      eyebrow={EYEBROW}
      heading={`A check-in with ${coachName}.`}
      subhead={`${coachName} picked a time. You can approve or decline it.`}
      details={details}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={checkinsUrl} label={BUTTON_LABEL} />
    </CheckinEmailLayout>
  );
}

CheckinScheduled.PreviewProps = {} satisfies CheckinScheduledProps;

export default CheckinScheduled;
