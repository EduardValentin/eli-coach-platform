import { formatCallSchedule } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
  weeklyCheckinMoment,
} from './_checkinEmailLayout';

export type CheckinSeriesSetUpProps = {
  coachName?: string;
  firstStartsAt?: Date;
  clientTimeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_FIRST_STARTS_AT = new Date('2026-10-14T15:00:00.000Z');

const EYEBROW = 'Check-in — weekly';
const BUTTON_LABEL = 'See your check-ins';
const FOOTER_LINE =
  'You received this email because your coach set up a weekly check-in with you on the Evoa site.';

export function checkinSeriesSetUpSubject(coachName: string): string {
  return `${coachName} set up a weekly check-in with you`;
}

export function CheckinSeriesSetUp({
  coachName = 'Eli',
  firstStartsAt = DEFAULT_FIRST_STARTS_AT,
  clientTimeZone = 'Europe/London',
  checkinsUrl = '/portal/checkins',
}: CheckinSeriesSetUpProps) {
  return (
    <CheckinEmailLayout
      subject={checkinSeriesSetUpSubject(coachName)}
      eyebrow={EYEBROW}
      heading={`A weekly check-in with ${coachName}.`}
      subhead={`${coachName} booked a check-in every week until your paid period ends.`}
      details={[
        { label: 'WHEN', value: weeklyCheckinMoment(firstStartsAt, clientTimeZone) },
        { label: 'FIRST WEEK', value: formatCallSchedule(firstStartsAt, clientTimeZone) },
      ]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={checkinsUrl} label={BUTTON_LABEL} />
    </CheckinEmailLayout>
  );
}

CheckinSeriesSetUp.PreviewProps = {} satisfies CheckinSeriesSetUpProps;

export default CheckinSeriesSetUp;
