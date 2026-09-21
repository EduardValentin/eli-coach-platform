import { render as renderEmail } from '@react-email/render';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AssessmentCallVisitorConfirmation,
  type AssessmentCallVisitorConfirmationProps,
} from './AssessmentCallVisitorConfirmation';

const JOIN_URL = 'https://evoa.fit/book/ac-demo/join';
const CALENDAR_URL = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
const STARTS_AT = new Date('2026-03-02T15:00:00.000Z');
const TIME_ZONE = 'Europe/Bucharest';

async function mountConfirmation(
  props: AssessmentCallVisitorConfirmationProps = {},
) {
  const html = await renderEmail(
    <AssessmentCallVisitorConfirmation
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

describe('AssessmentCallVisitorConfirmation', () => {
  it('names when the call is, in the recipient zone, and how long it runs', async () => {
    // arrange
    // act
    await mountConfirmation();

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /your call is booked/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText(/Monday, 2 March 2026 at 5:00\s?[AaPp][Mm]/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Europe\/Bucharest \(GMT\+2\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
  });

  it('greets her by first name', async () => {
    // arrange
    // act
    await mountConfirmation({ visitorFirstName: 'Sofia' });

    // assert
    expect(screen.getByText('Hi Sofia,')).toBeInTheDocument();
  });

  it('offers both ways to keep the call and says the calendar file is attached', async () => {
    // arrange
    // act
    await mountConfirmation();

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

  it('repeats what the visitor shared only when she wrote something', async () => {
    // arrange
    const shared = 'Recovering from a knee injury';

    // act
    await mountConfirmation({ variant: 'with-notes', notes: shared });

    // assert
    expect(screen.getByText(shared)).toBeInTheDocument();
  });

  it('leaves the shared-note block out when there is nothing to repeat', async () => {
    // arrange
    // act
    await mountConfirmation({ variant: 'without-notes' });

    // assert
    expect(screen.queryByText(/what you shared/i)).not.toBeInTheDocument();
  });

  it('declares language, direction and its subject line', async () => {
    // arrange
    // act
    const parsed = await mountConfirmation();

    // assert
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
    expect(parsed.documentElement.getAttribute('dir')).toBe('ltr');
    expect(parsed.title).toBe('Your free assessment call is booked.');
  });
});
