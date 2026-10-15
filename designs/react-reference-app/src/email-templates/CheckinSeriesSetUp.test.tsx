import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckinSeriesSetUp, type CheckinSeriesSetUpProps } from './CheckinSeriesSetUp';

const FIRST_STARTS_AT = new Date('2026-10-14T15:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountSetUp(props: CheckinSeriesSetUpProps = {}) {
  const html = await renderEmail(
    <CheckinSeriesSetUp firstStartsAt={FIRST_STARTS_AT} clientTimeZone={CLIENT_ZONE} {...props} />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinSeriesSetUp', () => {
  it('names the coach who set it up in its subject', async () => {
    // arrange
    const props: CheckinSeriesSetUpProps = { coachName: 'Eli' };

    // act
    const parsed = await mountSetUp(props);

    // assert
    expect(parsed.title).toBe('Eli set up a weekly check-in with you');
  });

  it('names the weekday and time in her zone and the first week', async () => {
    // arrange
    const props: CheckinSeriesSetUpProps = { coachName: 'Eli' };

    // act
    await mountSetUp(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'A weekly check-in with Eli.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Eli booked a check-in every week until your paid period ends.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Every Wednesday at 4:00\s?PM — Europe\/London \(GMT\+1\)$/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Wednesday, 14 October 2026 at 4:00\s?PM$/),
    ).toBeInTheDocument();
  });

  it('links to her check-ins and attaches no calendar', async () => {
    // arrange
    const props: CheckinSeriesSetUpProps = { checkinsUrl: 'https://evoa.test/portal/checkins' };

    // act
    await mountSetUp(props);

    // assert
    expect(screen.getByRole('link', { name: 'See your check-ins' })).toHaveAttribute(
      'href',
      'https://evoa.test/portal/checkins',
    );
    expect(screen.queryByRole('link', { name: 'Add to Google Calendar' })).not.toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinSeriesSetUpProps = {};

    // act
    const parsed = await mountSetUp(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
