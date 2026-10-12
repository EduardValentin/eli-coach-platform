import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinNewTimeAccepted,
  type CheckinNewTimeAcceptedProps,
} from './CheckinNewTimeAccepted';

const JOIN_URL = 'https://evoa.fit/coach/checkins/ci-1/join';
const CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Sofia+Marin';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const COACH_ZONE = 'Europe/Bucharest';

async function mountAccepted(props: CheckinNewTimeAcceptedProps = {}) {
  const html = await renderEmail(
    <CheckinNewTimeAccepted
      joinUrl={JOIN_URL}
      googleCalendarUrl={CALENDAR_URL}
      startsAt={STARTS_AT}
      timeZone={COACH_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinNewTimeAccepted', () => {
  it('names who accepted in its subject', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = { who: 'Sofia Marin' };

    // act
    const parsed = await mountAccepted(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin accepted the new time');
  });

  it('names who accepted and the new time, in the recipient zone', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = { who: 'Sofia Marin' };

    // act
    await mountAccepted(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'The new time is set.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CHECK-IN — NEW TIME ACCEPTED')).toBeInTheDocument();
    expect(screen.getByText('WHO')).toBeInTheDocument();
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(screen.getByText('WHEN')).toBeInTheDocument();
    expect(screen.getByText(/Monday, 12 October 2026 at 5:00\s?[AaPp][Mm]/)).toBeInTheDocument();
    expect(screen.getByText(/Europe\/Bucharest \(GMT\+3\)/)).toBeInTheDocument();
  });

  it('links Join the check-in to the recipient join link', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = {};

    // act
    await mountAccepted(props);

    // assert
    expect(screen.getByRole('link', { name: 'Join the check-in' })).toHaveAttribute(
      'href',
      JOIN_URL,
    );
    expect(screen.getByText('Use the button to join when it is time.')).toBeInTheDocument();
  });

  it('offers the new time to a calendar by link and by the attached invite', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = {};

    // act
    await mountAccepted(props);

    // assert
    expect(screen.getByRole('link', { name: 'Add to Google Calendar' })).toHaveAttribute(
      'href',
      CALENDAR_URL,
    );
    expect(
      screen.getByText(
        'A calendar file is attached to this email, so you can add the check-in to any calendar you use.',
      ),
    ).toBeInTheDocument();
  });

  it('names the event in its footer', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = {};

    // act
    await mountAccepted(props);

    // assert
    expect(
      screen.getByText(
        'You received this email because a new time you proposed for a check-in was accepted on the Evoa site.',
      ),
    ).toBeInTheDocument();
  });

  it('declares its language and direction', async () => {
    // arrange
    const props: CheckinNewTimeAcceptedProps = {};

    // act
    const parsed = await mountAccepted(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
