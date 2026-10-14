import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinSeriesStopped, type CheckinSeriesStoppedProps } from './CheckinSeriesStopped';

const WEEK_STARTS_AT = new Date('2026-10-14T15:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountStopped(props: CheckinSeriesStoppedProps = {}) {
  const html = await renderEmail(
    <CheckinSeriesStopped weekStartsAt={WEEK_STARTS_AT} clientTimeZone={CLIENT_ZONE} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinSeriesStopped', () => {
  it('names the coach who stopped it in its subject', async () => {
    // arrange
    const props: CheckinSeriesStoppedProps = { coachName: 'Eli' };

    // act
    const parsed = await mountStopped(props);

    // assert
    expect(parsed.title).toBe('Eli stopped your weekly check-in');
  });

  it('says which weekly check-in stopped and that her coach arranges any next one', async () => {
    // arrange
    const props: CheckinSeriesStoppedProps = { coachName: 'Eli' };

    // act
    await mountStopped(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your weekly check-in has stopped.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Eli cancelled every week still to come.')).toBeInTheDocument();
    expect(
      screen.getByText(/^Every Wednesday at 4:00\s?PM — Europe\/London \(GMT\+1\)$/),
    ).toBeInTheDocument();
    expect(screen.getByText('Your coach will arrange any next check-in with you.')).toBeInTheDocument();
  });

  it('links to her check-ins', async () => {
    // arrange
    const props: CheckinSeriesStoppedProps = { checkinsUrl: 'https://evoa.test/portal/checkins' };

    // act
    await mountStopped(props);

    // assert
    expect(screen.getByRole('link', { name: 'See your check-ins' })).toHaveAttribute(
      'href',
      'https://evoa.test/portal/checkins',
    );
  });
});
