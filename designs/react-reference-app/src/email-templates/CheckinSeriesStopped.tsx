import {
  CheckinEmailButton,
  CheckinEmailClosingLine,
  CheckinEmailLayout,
  weeklyCheckinMoment,
} from './_checkinEmailLayout';

export type CheckinSeriesStoppedProps = {
  coachName?: string;
  weekStartsAt?: Date;
  clientTimeZone?: string;
  checkinsUrl?: string;
};

const DEFAULT_WEEK_STARTS_AT = new Date('2026-10-14T15:00:00.000Z');

const EYEBROW = 'Check-in — weekly';
const HEADING = 'Your weekly check-in has stopped.';
const BUTTON_LABEL = 'See your check-ins';
const CLOSING_LINE = 'Your coach will arrange any next check-in with you.';
const FOOTER_LINE =
  'You received this email because your coach stopped your weekly check-in on the Evoa site.';

export function checkinSeriesStoppedSubject(coachName: string): string {
  return `${coachName} stopped your weekly check-in`;
}

export function CheckinSeriesStopped({
  coachName = 'Eli',
  weekStartsAt = DEFAULT_WEEK_STARTS_AT,
  clientTimeZone = 'Europe/London',
  checkinsUrl = '/portal/checkins',
}: CheckinSeriesStoppedProps) {
  return (
    <CheckinEmailLayout
      subject={checkinSeriesStoppedSubject(coachName)}
      eyebrow={EYEBROW}
      heading={HEADING}
      subhead={`${coachName} cancelled every week still to come.`}
      details={[{ label: 'WHEN', value: weeklyCheckinMoment(weekStartsAt, clientTimeZone) }]}
      footerLine={FOOTER_LINE}
    >
      <CheckinEmailButton href={checkinsUrl} label={BUTTON_LABEL} />
      <CheckinEmailClosingLine>{CLOSING_LINE}</CheckinEmailClosingLine>
    </CheckinEmailLayout>
  );
}

CheckinSeriesStopped.PreviewProps = {} satisfies CheckinSeriesStoppedProps;

export default CheckinSeriesStopped;
