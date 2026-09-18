import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AssessmentCallCoachNotification,
  type AssessmentCallCoachNotificationProps,
} from './AssessmentCallCoachNotification';

const JOIN_URL = 'https://evoa.fit/book/ac-demo/join';
const CALENDAR_URL = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
const STARTS_AT = new Date('2026-03-02T15:00:00.000Z');
const TIME_ZONE = 'Europe/Bucharest';

async function mountNotification(
  props: AssessmentCallCoachNotificationProps = {},
) {
  const html = await renderEmail(
    <AssessmentCallCoachNotification
      joinUrl={JOIN_URL}
      googleCalendarUrl={CALENDAR_URL}
      startsAt={STARTS_AT}
      timeZone={TIME_ZONE}
      {...props}
    />,
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  render(<div dangerouslySetInnerHTML={{ __html: parsed.body.innerHTML }} />);

  return parsed;
}

describe('AssessmentCallCoachNotification', () => {
  it('names who booked, when the call is in the coach zone, and how long it runs', async () => {
    // arrange
    // act
    await mountNotification({
      visitorName: 'Sofia Marin',
      visitorEmail: 'sofia@example.com',
    });

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /new assessment call/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Sofia Marin')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'sofia@example.com' }),
    ).toHaveAttribute('href', 'mailto:sofia@example.com');
    expect(
      screen.getByText(/Monday, 2 March 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/Bucharest \(GMT\+2\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
  });

  it('offers both ways to keep the call and says the calendar file is attached', async () => {
    // arrange
    // act
    await mountNotification();

    // assert
    expect(screen.getByRole('link', { name: 'Join the call' })).toHaveAttribute(
      'href',
      JOIN_URL,
    );
    expect(
      screen.getByRole('link', { name: 'Add to Google Calendar' }),
    ).toHaveAttribute('href', CALENDAR_URL);
    expect(
      screen.getByText(/calendar file is attached to this email/i),
    ).toBeInTheDocument();
  });

  it('passes on what she shared only when she wrote something', async () => {
    // arrange
    const shared = 'Training around a shoulder niggle';

    // act
    await mountNotification({ variant: 'with-notes', notes: shared });

    // assert
    expect(screen.getByText(shared)).toBeInTheDocument();
  });

  it('leaves the shared-note block out when there is nothing to pass on', async () => {
    // arrange
    // act
    await mountNotification({ variant: 'without-notes' });

    // assert
    expect(screen.queryByText(/what she shared/i)).not.toBeInTheDocument();
  });

  it('declares language, direction and its subject line', async () => {
    // arrange
    // act
    const parsed = await mountNotification();

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
    expect(parsed.title).toBe('New assessment call booked.');
  });
});
