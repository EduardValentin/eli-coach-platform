import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Book } from './Book';
import { AppProvider } from '../context/AppContext';
import { StoreProvider } from '../context/StoreContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';

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
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <Book />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
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

const TIME_NAME = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;

function timeButtons(): HTMLElement[] {
  return screen.queryAllByRole('button', { name: TIME_NAME });
}

async function pickFirstOpenSlot(user: UserEvent) {
  await pickFirstOpenDay(user);
  const times = await screen.findAllByRole('button', { name: TIME_NAME });
  await user.click(times[0]);
}

function chosenCall(): string {
  return within(screen.getByRole('complementary', { name: 'About the call' }))
    .getByText(TIME_NAME).parentElement!.textContent!;
}

async function reachDetails(user: UserEvent) {
  await pickFirstOpenSlot(user);
  await user.click(screen.getByRole('button', { name: 'Continue to your details' }));
  await screen.findByRole('heading', { level: 2, name: 'Almost there' });
}

async function fillDetails(user: UserEvent) {
  await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Email Address'), 'jane@example.com');
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
    expect(screen.queryByText('Free Assessment Call')).not.toBeInTheDocument();
  });

  it('titles the page once and labels its landmarks', async () => {
    // arrange
    // act
    renderBook();

    // assert
    const headings = await screen.findAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Free Assessment Call');
    expect(
      screen.getByRole('main', { name: 'Book a free assessment call' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'About the call' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Select a Date & Time' }),
    ).toBeInTheDocument();
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
    const timesBeforeADayIsPicked = timeButtons();
    await user.click(openDayButtons()[0]);

    // assert
    expect(timesBeforeADayIsPicked).toHaveLength(0);
    expect(
      await screen.findAllByRole('button', { name: TIME_NAME }),
    ).not.toHaveLength(0);
  });

  it('lets the visitor continue only once a time is chosen', async () => {
    // arrange
    const user = renderBook();
    await pickFirstOpenDay(user);
    const continueButton = screen.getByRole('button', {
      name: 'Select a date and time',
    });

    // act
    await user.click((await screen.findAllByRole('button', { name: TIME_NAME }))[0]);

    // assert
    expect(continueButton).toHaveAccessibleName('Continue to your details');
    expect(continueButton).toBeEnabled();
    expect(timeButtons()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the chosen time when the visitor picks another day', async () => {
    // arrange
    const user = renderBook();
    await pickFirstOpenSlot(user);

    // act
    await user.click(openDayButtons()[1]);

    // assert
    expect(
      screen.getByRole('button', { name: 'Select a date and time' }),
    ).toBeDisabled();
  });

  it('moves focus to the details heading and shows the chosen call beside it', async () => {
    // arrange
    const user = renderBook();
    await pickFirstOpenSlot(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Continue to your details' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Almost there' }),
    ).toHaveFocus();
    expect(chosenCall()).toMatch(/^\w+day, \w+ \d{1,2}, \d{4}/);
  });

  it('moves focus to the times heading when the visitor goes back to them', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Back to the times' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Select a Date & Time' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Continue to your details' }),
    ).toBeEnabled();
  });

  it('reopens the calendar on the month of a next-month day picked from the overflow row', async () => {
    // arrange
    vi.setSystemTime(new Date('2026-03-05T06:00:00.000Z'));
    const user = renderBook();
    await waitFor(() => expect(openDayButtons().length).toBeGreaterThan(0));
    const overflowDay = document.querySelector<HTMLButtonElement>(
      'td[data-outside] button:not([disabled])',
    );
    expect(overflowDay).not.toBeNull();
    const overflowDayKey = overflowDay!.closest('td')!.getAttribute('data-day');
    await user.click(overflowDay!);
    await user.click((await screen.findAllByRole('button', { name: TIME_NAME }))[0]);
    await user.click(screen.getByRole('button', { name: 'Continue to your details' }));
    await screen.findByRole('heading', { level: 2, name: 'Almost there' });

    // act
    await user.click(screen.getByRole('button', { name: 'Back to the times' }));

    // assert
    expect(await screen.findByRole('grid', { name: 'April 2026' })).toBeInTheDocument();
    const selectedCell = screen.getByRole('gridcell', { selected: true });
    expect(selectedCell).toHaveAttribute('data-day', overflowDayKey);
    expect(selectedCell).not.toHaveAttribute('data-outside');
    expect(selectedCell.querySelector('button')).toHaveAttribute('tabindex', '0');
  });

  it('explains each rejected detail under its field and keeps the chosen time', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    const callBefore = chosenCall();

    // act
    await user.type(screen.getByLabelText('Full Name'), 'J');
    await user.type(screen.getByLabelText('Email Address'), 'not-an-address');
    await user.click(screen.getByLabelText('Anything to share beforehand? (Optional)'));
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    expect(screen.getByLabelText('Full Name')).toHaveAccessibleDescription(
      'Enter your full name, between 2 and 120 characters.',
    );
    expect(screen.getByLabelText('Email Address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(
      screen.getByLabelText('Anything to share beforehand? (Optional)'),
    ).toHaveAccessibleDescription('Keep your note under 1000 characters.');
    expect(screen.getByLabelText('Full Name')).toHaveAttribute('aria-invalid', 'true');
    expect(chosenCall()).toBe(callBefore);
  });

  it('moves focus to the first rejected detail', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email Address'), 'not-an-address');

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    expect(screen.getByLabelText('Email Address')).toHaveFocus();
  });

  it('confirms a booked call with its time, zone, length and a way to join it', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: "You're booked!" }, BOOKING_WAIT),
    ).toHaveFocus();
    expect(
      screen.getByText(/A confirmation with your join link is on its way to/),
    ).toHaveTextContent('jane@example.com');
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) =>
        element?.tagName === 'P' &&
        /\d{1,2}:\d{2}\s?(AM|PM) \(/i.test(content) &&
        content.includes(`(${VISITOR_TIME_ZONE}, GMT`),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join the call' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Home' })).toHaveAttribute('href', '/');
  });

  it('returns to the times with an explanation when the chosen one was taken', async () => {
    // arrange
    const user = renderBook('?booking=slot_unavailable');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/taken while you were filling in your details/i);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Select a Date & Time' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Select a date and time' }),
    ).toBeDisabled();
  });

  it('refuses the booking without revealing anything about another call', async () => {
    // arrange
    const user = renderBook('?booking=booking_refused');
    await reachDetails(user);
    const callBefore = chosenCall();
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(
      "We couldn't book this call. Email us and we'll sort it out.",
    );
    expect(screen.getByRole('link', { name: 'contact@evoa.fit' })).toHaveAttribute(
      'href',
      'mailto:contact@evoa.fit',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Almost there' }),
    ).toBeInTheDocument();
    expect(chosenCall()).toBe(callBefore);
    expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Email Address')).toHaveValue('jane@example.com');
    expect(alert).not.toHaveTextContent(/\bon\b|\d{1,2}:\d{2}|join/i);
    expect(screen.queryByRole('link', { name: /join/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="/join"]')).not.toBeInTheDocument();
  });

  it('offers a retry and a way to reach Eli when the server fails', async () => {
    // arrange
    const user = renderBook('?booking=server_error');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/went wrong on our end/i);
    expect(screen.getByRole('link', { name: 'contact@evoa.fit' })).toHaveAttribute(
      'href',
      'mailto:contact@evoa.fit',
    );
    expect(screen.getByRole('button', { name: 'Schedule Assessment' })).toBeEnabled();
  });

  it('rejects an email the server will not accept, without losing the details', async () => {
    // arrange
    const user = renderBook('?booking=invalid_email');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Assessment' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/doesn't look right/i);
    expect(screen.getByLabelText('Email Address')).toHaveValue('jane@example.com');
  });

  it('offers a retry when the open times cannot be loaded', async () => {
    // arrange
    // act
    renderBook('?bookingslots=unavailable');

    // assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load the open times just now.",
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
