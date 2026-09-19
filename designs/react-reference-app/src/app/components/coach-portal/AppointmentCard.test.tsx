import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppointmentCard } from './AppointmentCard';

const WHEN = { date: 'Monday, 21 September 2026', time: '6:00 PM' };

describe('the appointment card', () => {
  it('shows the attendee, the day and the time', () => {
    // arrange
    const attendee = { name: 'Maria Ionescu' };

    // act
    render(<AppointmentCard attendee={attendee} when={WHEN} />);

    // assert
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('Monday, 21 September 2026')).toBeInTheDocument();
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
  });

  it('falls back to the attendee initial when there is no photo', () => {
    // arrange
    const attendee = { name: 'Maria Ionescu' };

    // act
    render(<AppointmentCard attendee={attendee} when={WHEN} />);

    // assert
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('M')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the attendee photo without repeating the name to a screen reader', () => {
    // arrange
    const attendee = {
      name: 'Maria Ionescu',
      imageUrl: 'https://example.com/maria.jpg',
    };

    // act
    const { container } = render(
      <AppointmentCard attendee={attendee} when={WHEN} />,
    );

    // assert
    expect(screen.queryByText('M')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('offers a mail link only when the attendee has an address', () => {
    // arrange
    const withEmail = { name: 'Maria Ionescu', email: 'maria@example.com' };

    // act
    const { unmount } = render(
      <AppointmentCard attendee={withEmail} when={WHEN} />,
    );

    // assert
    expect(
      screen.getByRole('link', { name: 'maria@example.com' }),
    ).toHaveAttribute('href', 'mailto:maria@example.com');

    // act
    unmount();
    render(<AppointmentCard attendee={{ name: 'Maria Ionescu' }} when={WHEN} />);

    // assert
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('strikes through the time the appointment used to be at', () => {
    // arrange
    const supersededWhen = { date: 'Sunday, 20 September 2026', time: '9:00 AM' };

    // act
    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        supersededWhen={supersededWhen}
      />,
    );

    // assert
    expect(
      screen.getByText('Sunday, 20 September 2026 at 9:00 AM'),
    ).toBeInTheDocument();
  });

  it('quotes the note and keeps its line breaks', () => {
    // arrange
    const quote = 'Training three times a week.\nShoulder injury last year.';

    // act
    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        quote={quote}
      />,
    );

    // assert
    expect(
      screen.getByText(/Shoulder injury last year\./),
    ).toHaveTextContent('"Training three times a week. Shoulder injury last year."');
  });

  it('shows the footnote and the caller’s actions', () => {
    // arrange
    const actions = <button type="button">Join call</button>;

    // act
    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        footnote="Linked to training plan"
        actions={actions}
      />,
    );

    // assert
    expect(screen.getByText('Linked to training plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join call' })).toBeInTheDocument();
  });

  it('titles the attendee with the element the host asks for', () => {
    // arrange
    const titleElement = 'h2' as const;

    // act
    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        titleElement={titleElement}
      />,
    );

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Maria Ionescu' }),
    ).toBeInTheDocument();
  });

  it('lifts a scheduled appointment and leaves a past one flat and muted', () => {
    // arrange
    const attendee = { name: 'Maria Ionescu' };

    // act
    const scheduled = render(<AppointmentCard attendee={attendee} when={WHEN} />);
    const scheduledCard = scheduled.container.firstElementChild;

    // assert
    expect(scheduledCard).toHaveClass('shadow-soft');
    expect(scheduledCard).toHaveClass('text-text-primary');

    // act
    scheduled.unmount();
    const past = render(
      <AppointmentCard attendee={attendee} when={WHEN} status="past" />,
    );
    const pastCard = past.container.firstElementChild;

    // assert
    expect(pastCard).not.toHaveClass('shadow-soft');
    expect(pastCard).toHaveClass('text-muted-foreground');
  });
});
