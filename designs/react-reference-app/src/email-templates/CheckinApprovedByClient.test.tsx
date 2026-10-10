import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckinApprovedByClient,
  type CheckinApprovedByClientProps,
} from './CheckinApprovedByClient';

const JOIN_URL = 'https://evoa.fit/coach/checkins/ci-1/join';
const CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Check-in+with+Sofia+Marin';
const STARTS_AT = new Date('2026-10-12T14:00:00.000Z');
const COACH_ZONE = 'Europe/Bucharest';

async function mountApproved(props: CheckinApprovedByClientProps = {}) {
  const html = await renderEmail(
    <CheckinApprovedByClient
      joinUrl={JOIN_URL}
      googleCalendarUrl={CALENDAR_URL}
      startsAt={STARTS_AT}
      coachTimeZone={COACH_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('CheckinApprovedByClient', () => {
  it('names who approved in its subject', async () => {
    // arrange
    const props: CheckinApprovedByClientProps = { clientName: 'Sofia Marin' };

    // act
    const parsed = await mountApproved(props);

    // assert
    expect(parsed.title).toBe('Sofia Marin approved the check-in');
  });

  it('names who approved and when, in the coach zone', async () => {
    // arrange
    const props: CheckinApprovedByClientProps = { clientName: 'Sofia Marin' };

    // act
    await mountApproved(props);

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your check-in is approved.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('WHO')).toBeInTheDocument();
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(
      screen.getByText(/Monday, 12 October 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Europe\/Bucharest \(GMT\+3\)/)).toBeInTheDocument();
  });

  it('links Join Meet to the coach join link', async () => {
    // arrange
    const props: CheckinApprovedByClientProps = {};

    // act
    await mountApproved(props);

    // assert
    expect(screen.getByRole('link', { name: 'Join Meet' })).toHaveAttribute(
      'href',
      JOIN_URL,
    );
    expect(
      screen.getByText('Use the button to join when it is time.'),
    ).toBeInTheDocument();
  });

  it('offers the check-in to her calendar by link and by the attached invite', async () => {
    // arrange
    const props: CheckinApprovedByClientProps = {};

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
    const props: CheckinApprovedByClientProps = {};

    // act
    const parsed = await mountApproved(props);

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
