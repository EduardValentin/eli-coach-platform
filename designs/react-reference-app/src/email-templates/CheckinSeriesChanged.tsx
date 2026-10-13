import { formatCallSchedule } from '../app/utils/dateFormatters';
import {
  CheckinEmailButton,
  CheckinEmailLayout,
  weeklyCheckinMoment,
} from './_checkinEmailLayout';

export type CheckinSeriesChangedProps = {
  coachName?: string;
  firstStartsAt?: Date;
  clientTimeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_FIRST_STARTS_AT = new Date('2026-10-14T15:00:00.000Z');

const EYEBROW = 'Check-in — weekly';
const HEADING = 'Your weekly check-in moved.';
const BUTTON_LABEL = 'See your check-ins';
const FOOTER_LINE =
  'You received this email because your coach changed your weekly check-in on the Evoa site.';

export function checkinSeriesChangedSubject(coachName: string): string {
  return `${coachName} changed your weekly check-in`;
}

export function CheckinSeriesChanged({
  coachName = 'Eli',
  firstStartsAt = DEFAULT_FIRST_STARTS_AT,
  clientTimeZone = 'Europe/London',
  checkinsUrl = '/portal/checkins',
}: CheckinSeriesChangedProps) {
  return (
    <CheckinEmailLayout
      subject={checkinSeriesChangedSubject(coachName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={`${coachName} moved every week still to come.`}
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

CheckinSeriesChanged.PreviewProps = {} satisfies CheckinSeriesChangedProps;

export default CheckinSeriesChanged;
