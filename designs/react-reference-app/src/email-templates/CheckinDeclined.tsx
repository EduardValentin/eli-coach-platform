import { formatCallMoment } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
} from './_checkinEmailLayout';

export type CheckinDeclinedProps = {
  coachName?: string;
  startsAt?: Date;
  clientTimeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_STARTS_AT = new Date('2026-10-12T14:00:00.000Z');

const EYEBROW = 'Check-in — declined';
const SUBHEAD = 'You can pick another time on your Check-ins page.';
const BUTTON_LABEL = 'Pick another time';
const FOOTER_LINE =
  'You received this email because your coach answered a check-in you asked for on the Evoa site.';

export function checkinDeclinedSubject(coachName: string): string {
  return `${coachName} could not make your check-in time`;
}

export function CheckinDeclined({
  coachName = 'Eli',
  startsAt = DEFAULT_STARTS_AT,
  clientTimeZone = 'Europe/London',
  checkinsUrl = '/client/checkins',
}: CheckinDeclinedProps) {
  return (
    <CheckinEmailLayout
      subject={checkinDeclinedSubject(coachName)}
      eyebrow={EYEBROW}
      heading={`${coachName} could not make that time.`}
      subhead={SUBHEAD}
      details={[
        {
          label: 'YOU ASKED FOR',
          value: formatCallMoment(startsAt, clientTimeZone),
        },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={checkinsUrl}>{BUTTON_LABEL}</CheckinEmailButton>
    </CheckinEmailLayout>
  );
}

CheckinDeclined.PreviewProps = {} satisfies CheckinDeclinedProps;

export default CheckinDeclined;
