import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinDeclined,
  type CheckinDeclinedProps,
} from './CheckinDeclined';

const CHECKINS_URL = 'https://evoa.fit/client/checkins';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountDeclined(props: CheckinDeclinedProps = {}) {
  const html = await renderEmail(
    <CheckinDeclined
      checkinsUrl={CHECKINS_URL}
      startsAt={STARTS_AT}
      clientTimeZone={CLIENT_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinDeclined', () => {
  it('names the coach in its subject', async () => {
    // arrange
    const props: CheckinDeclinedProps = { coachName: 'Eli' };

    // act
    const parsed = await mountDeclined(props);

    // assert
    expect(parsed.title).toBe('Eli could not make your check-in time');
  });

  it('names the time she could not make, in the client zone', async () => {
    // arrange
    const props: CheckinDeclinedProps = { coachName: 'Eli' };

    // act
    await mountDeclined(props);

    // assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Eli could not make that time.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/London \(GMT\+1\)/),
    ).toBeInTheDocument();
  });

  it('points her to her Check-ins page to pick another time', async () => {
    // arrange
    const props: CheckinDeclinedProps = {};

    // act
    await mountDeclined(props);

    // assert
    expect(
      screen.getByText('You can pick another time on your Check-ins page.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Pick another time' }),
    ).toHaveAttribute('href', CHECKINS_URL);
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinDeclinedProps = {};

    // act
    const parsed = await mountDeclined(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
