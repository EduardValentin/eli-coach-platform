import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppointmentCard } from './AppointmentCard';

class ImmediatelyLoadedImage {
  complete = true;
  naturalWidth = 1;
  src = '';
  addEventListener() {}
  removeEventListener() {}
}

const WHEN = { startsAt: new Date('2026-09-21T18:00:00Z'), timeZone: 'UTC' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the appointment card', () => {
  it('shows the attendee, the day and the time', () => {
    const attendee = { name: 'Maria Ionescu' };

    render(<AppointmentCard attendee={attendee} when={WHEN} />);

    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getByText('Mon, Sep 21')).toBeInTheDocument();
    expect(screen.getByText('· 6:00 PM')).toBeInTheDocument();
  });

  it('falls back to the attendee initials when there is no photo', () => {
    const attendee = { name: 'Maria Ionescu' };

    render(<AppointmentCard attendee={attendee} when={WHEN} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('MI')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the attendee photo without repeating the name to a screen reader', () => {
    vi.stubGlobal('Image', ImmediatelyLoadedImage);

    const attendee = {
      name: 'Maria Ionescu',
      imageUrl: 'https://example.com/maria.jpg',
    };

    const { container } = render(
      <AppointmentCard attendee={attendee} when={WHEN} />,
    );

    expect(screen.queryByText('MI')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('lists the caller-supplied details as a definition list', () => {
    const details = [
      { label: 'Age', value: '31 (14 Mar 1994)' },
      { label: 'Gender', value: 'Female' },
    ];

    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        details={details}
      />,
    );

    const terms = screen.getAllByRole('term').map((term) => term.textContent);
    const definitions = screen
      .getAllByRole('definition')
      .map((definition) => definition.textContent);
    expect(terms).toEqual(['Age', 'Gender']);
    expect(definitions).toEqual(['31 (14 Mar 1994)', 'Female']);
  });

  it('renders no details list when the caller supplies none', () => {
    render(
      <AppointmentCard attendee={{ name: 'Maria Ionescu' }} when={WHEN} />,
    );

    expect(screen.queryByRole('term')).toBeNull();
  });

  it('offers a phone link beside the mail link when the attendee has a number', () => {
    const attendee = {
      name: 'Maria Ionescu',
      email: 'maria@example.com',
      phone: '+40712345678',
    };

    render(<AppointmentCard attendee={attendee} when={WHEN} />);

    expect(screen.getByRole('link', { name: '+40712345678' })).toHaveAttribute(
      'href',
      'tel:+40712345678',
    );
    expect(
      screen.getByRole('link', { name: 'maria@example.com' }),
    ).toBeInTheDocument();
  });

  it('offers a mail link only when the attendee has an address', () => {
    const withEmail = { name: 'Maria Ionescu', email: 'maria@example.com' };

    const { unmount } = render(
      <AppointmentCard attendee={withEmail} when={WHEN} />,
    );

    expect(
      screen.getByRole('link', { name: 'maria@example.com' }),
    ).toHaveAttribute('href', 'mailto:maria@example.com');

    unmount();
    render(
      <AppointmentCard attendee={{ name: 'Maria Ionescu' }} when={WHEN} />,
    );

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('strikes through the time the appointment used to be at', () => {
    const supersededWhen = {
      startsAt: new Date('2026-09-20T09:00:00Z'),
      timeZone: 'UTC',
    };

    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        supersededWhen={supersededWhen}
      />,
    );

    expect(screen.getByText('Sun, Sep 20 · 9:00 AM').tagName).toBe('S');
  });

  it('quotes the note and keeps its line breaks', () => {
    const quote = 'Training three times a week.\nShoulder injury last year.';

    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        quote={quote}
      />,
    );

    expect(screen.getByText(/Shoulder injury last year\./)).toHaveTextContent(
      '"Training three times a week. Shoulder injury last year."',
    );
  });

  it('shows the footnote and the caller’s actions', () => {
    const actions = <button type="button">Join call</button>;

    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        footnote="Linked to training plan"
        actions={actions}
      />,
    );

    expect(screen.getByText('Linked to training plan')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Join call' }),
    ).toBeInTheDocument();
  });

  it('titles the attendee with the element the host asks for', () => {
    const titleElement = 'h2' as const;

    render(
      <AppointmentCard
        attendee={{ name: 'Maria Ionescu' }}
        when={WHEN}
        titleElement={titleElement}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Maria Ionescu' }),
    ).toBeInTheDocument();
  });

  it('lifts a scheduled appointment and leaves a past one flat and muted', () => {
    const attendee = { name: 'Maria Ionescu' };

    const scheduled = render(
      <AppointmentCard attendee={attendee} when={WHEN} />,
    );
    const scheduledCard = scheduled.container.firstElementChild;

    expect(scheduledCard).toHaveClass('shadow-soft');
    expect(scheduledCard).toHaveClass('text-text-primary');

    scheduled.unmount();
    const past = render(
      <AppointmentCard attendee={attendee} when={WHEN} status="past" />,
    );
    const pastCard = past.container.firstElementChild;

    expect(pastCard).not.toHaveClass('shadow-soft');
    expect(pastCard).toHaveClass('text-muted-foreground');
  });
});
