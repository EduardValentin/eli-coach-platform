import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinApproved,
  type CheckinApprovedProps,
} from './CheckinApproved';

const JOIN_URL = 'https://evoa.fit/client/checkins/ci-1/join';
const CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Eli';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const CLIENT_ZONE = 'Europe/London';

async function mountApproved(props: CheckinApprovedProps = {}) {
  const html = await renderEmail(
    <CheckinApproved
      joinUrl={JOIN_URL}
      googleCalendarUrl={CALENDAR_URL}
      startsAt={STARTS_AT}
      clientTimeZone={CLIENT_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinApproved', () => {
  it('tells her the check-in is approved in its subject', async () => {
    // arrange
    const props: CheckinApprovedProps = {};

    // act
    const parsed = await mountApproved(props);

    // assert
    expect(parsed.title).toBe('Your check-in is approved');
  });

  it('names the coach and the time, in the client zone', async () => {
    // arrange
    const props: CheckinApprovedProps = { coachName: 'Eli' };

    // act
    await mountApproved(props);

    // assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Your check-in is approved.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Eli approved your check-in.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 3:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/London \(GMT\+1\)/),
    ).toBeInTheDocument();
  });

  it('links Join Meet to her join link and says when it opens', async () => {
    // arrange
    const props: CheckinApprovedProps = {};

    // act
    await mountApproved(props);

    // assert
    expect(screen.getByRole('link', { name: 'Join Meet' })).toHaveAttribute(
      'href',
      JOIN_URL,
    );
    expect(
      screen.getByText(
        'Use the button to join when it is time.',
      ),
    ).toBeInTheDocument();
  });

  it('offers the check-in to her calendar by link and by the attached invite', async () => {
    // arrange
    const props: CheckinApprovedProps = {};

    // act
    await mountApproved(props);

    // assert
    expect(
      screen.getByRole('link', { name: 'Add to Google Calendar' }),
    ).toHaveAttribute('href', CALENDAR_URL);
    expect(
      screen.getByText(
        'A calendar file is attached to this email, so you can add the check-in to any calendar you use.',
      ),
    ).toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinApprovedProps = {};

    // act
    const parsed = await mountApproved(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
