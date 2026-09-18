import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Book } from './Book';
import { AppProvider } from '../context/AppContext';
import { StoreProvider } from '../context/StoreContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';

const TODAY = new Date('2026-03-02T06:00:00.000Z');
const VISITOR_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const BOOKING_WAIT = { timeout: 4000 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderBook(search = '') {
  window.history.replaceState({}, '', `/book${search}`);
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={[`/book${search}`]}>
      <AppProvider>
        <StoreProvider>
          <AssessmentCallProvider>
            <Book />
          </AssessmentCallProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return user;
}

function openDayButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      'td[data-day] button:not([disabled])',
    ),
  );
}

async function pickFirstOpenDay(user: UserEvent) {
  await waitFor(() => expect(openDayButtons().length).toBeGreaterThan(0));
  await user.click(openDayButtons()[0]);
}

async function pickFirstOpenSlot(user: UserEvent) {
  await pickFirstOpenDay(user);
  const times = await screen.findAllByRole('radio');
  await user.click(times[0]);
}

async function reachDetails(user: UserEvent) {
  await pickFirstOpenSlot(user);
  await user.click(screen.getByRole('button', { name: 'Continue to your details' }));
  await screen.findByRole('heading', { level: 2, name: 'Your details' });
}

async function fillDetails(user: UserEvent) {
  await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Email address'), 'jane@example.com');
}

describe('Book', () => {
  it('sends the visitor to the not-found page while the site is in waitlist mode', async () => {
    // arrange
    // act
    renderBook('?waitlist=1');

    // assert
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Start Your Plan')).not.toBeInTheDocument();
  });

  it('says why each closed day cannot be picked', async () => {
    // arrange
    renderBook();

    // act
    await waitFor(() => expect(openDayButtons().length).toBeGreaterThan(0));

    // assert
    expect(
      screen.getAllByRole('button', { name: /No open slots$/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /Past day$/ }).length,
    ).toBeGreaterThan(0);
  });

  it('offers the times only once a day is picked, and names the zone they are in', async () => {
    // arrange
    const user = renderBook();
    await waitFor(() => expect(openDayButtons().length).toBeGreaterThan(0));

    // act
    const timesBeforeADayIsPicked = screen.queryAllByRole('radio');
    await user.click(openDayButtons()[0]);

    // assert
    expect(timesBeforeADayIsPicked).toHaveLength(0);
    const times = await screen.findAllByRole('radio');
    expect(times.length).toBeGreaterThan(0);
    expect(times[0]).toHaveAccessibleName(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    expect(
      screen.getByText(
        (content) =>
          content.includes('Times are shown in') &&
          content.includes(VISITOR_TIME_ZONE) &&
          content.includes('GMT'),
      ),
    ).toBeInTheDocument();
  });

  it('moves focus to the details heading when the visitor continues', async () => {
    // arrange
    const user = renderBook();
    await pickFirstOpenSlot(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Continue to your details' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your details' }),
    ).toHaveFocus();
  });

  it('moves focus to the times heading when the visitor goes back to them', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Back to the times' }));

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pick a date and time' }),
    ).toHaveFocus();
  });

  it('keeps the chosen time when the details are rejected', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    const chosenTime = screen.getByText(/Your call:/).textContent;

    // act
    await user.type(screen.getByLabelText('Full name'), 'J');
    await user.type(screen.getByLabelText('Email address'), 'not-an-address');
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    expect(
      screen.getByText('Enter your full name, between 2 and 120 characters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription(
      'Enter your full name, between 2 and 120 characters.',
    );
    expect(screen.getByText(/Your call:/).textContent).toBe(chosenTime);
  });

  it('confirms a booked call with its length and a way to join it', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: 'Your call is booked' },
        BOOKING_WAIT,
      ),
    ).toHaveFocus();
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join the call' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/book\/[a-z0-9-]+\/join$/),
    );
    expect(
      screen.getByRole('link', { name: 'Return to Home' }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByText((content) => content.includes(VISITOR_TIME_ZONE)),
    ).toBeInTheDocument();
  });

  it('returns to the times with an explanation when the chosen one was taken', async () => {
    // arrange
    const user = renderBook('?booking=slot_unavailable');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/taken while you were filling in your details/i);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pick a date and time' }),
    ).toHaveFocus();
  });

  it('refuses the booking without revealing anything about another call', async () => {
    // arrange
    const user = renderBook('?booking=booking_refused');
    await reachDetails(user);
    const chosenCall = screen.getByText(/^Your call:/).textContent;
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(
      "We couldn't book this call. Email us and we'll sort it out.",
    );
    expect(
      screen.getByRole('link', { name: 'contact@evoa.fit' }),
    ).toHaveAttribute('href', 'mailto:contact@evoa.fit');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your details' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Your call:/)).toHaveTextContent(chosenCall ?? '');
    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    );
    expect(alert).not.toHaveTextContent(/\bon\b|\d{1,2}:\d{2}|join/i);
    expect(
      screen.queryByRole('link', { name: /join/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href*="/join"]'),
    ).not.toBeInTheDocument();
  });

  it('offers a retry and a way to reach Eli when the server fails', async () => {
    // arrange
    const user = renderBook('?booking=server_error');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/went wrong on our end/i);
    expect(
      screen.getByRole('link', { name: 'contact@evoa.fit' }),
    ).toHaveAttribute('href', 'mailto:contact@evoa.fit');
    expect(screen.getByRole('button', { name: 'Book my call' })).toBeEnabled();
  });

  it('rejects an email the server will not accept, without losing the details', async () => {
    // arrange
    const user = renderBook('?booking=invalid_email');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Book my call' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/doesn't look right/i);
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    );
  });

  it('offers a retry when the open times cannot be loaded', async () => {
    // arrange
    // act
    renderBook('?bookingslots=unavailable');

    // assert
    expect(
      await screen.findByText(
        "We couldn't load the open times just now.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
