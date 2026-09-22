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

async function chooseOption(user: UserEvent, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }));
  await user.click(await screen.findByRole('option', { name: option }));
}

function calendarDayButton(dayKey: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    `td[data-day="${dayKey}"] button`,
  );
  if (!button) throw new Error(`No calendar day ${dayKey}`);
  return button;
}

async function chooseBirthDate(user: UserEvent) {
  await user.click(screen.getByLabelText('Date of birth'));
  await chooseOption(user, 'Year', '1994');
  await chooseOption(user, 'Month', 'March');
  await user.click(calendarDayButton('1994-03-14'));
}

async function fillDetails(user: UserEvent) {
  await user.type(screen.getByLabelText('First name'), 'Jane');
  await user.type(screen.getByLabelText('Last name'), 'Doe');
  await user.type(screen.getByLabelText('Email Address'), 'jane@example.com');
  await chooseBirthDate(user);
  await chooseOption(user, 'Gender', 'Female');
  await chooseOption(user, 'Primary goal', 'Build strength');
  await chooseOption(user, 'Country', 'Romania');
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
    expect(screen.queryByText('Free Call')).not.toBeInTheDocument();
  });

  it('titles the page once and labels its landmarks', async () => {
    // arrange
    // act
    renderBook();

    // assert
    const headings = await screen.findAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Free Call');
    expect(
      screen.getByRole('main', { name: 'Book a free call' }),
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

  it('offers the times only once a day is picked, naming no zone', async () => {
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
    expect(screen.queryByText(/timezone|time zone|GMT/i)).not.toBeInTheDocument();
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
    await user.type(screen.getByLabelText('Email Address'), 'not-an-address');
    await user.type(screen.getByLabelText('Phone number'), '12ab');
    await user.click(screen.getByLabelText('Anything to share beforehand? (Optional)'));
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

    // assert
    expect(screen.getByLabelText('First name')).toHaveAccessibleDescription(
      'Enter your first name, up to 60 characters.',
    );
    expect(screen.getByLabelText('Last name')).toHaveAccessibleDescription(
      'Enter your last name, up to 60 characters.',
    );
    expect(screen.getByLabelText('Email Address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Date of birth')).toHaveAccessibleDescription(
      'Choose your date of birth.',
    );
    expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveAccessibleDescription(
      'Choose an option.',
    );
    expect(
      screen.getByRole('combobox', { name: 'Primary goal' }),
    ).toHaveAccessibleDescription('Choose your primary goal.');
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveAccessibleDescription(
      'Choose your country.',
    );
    expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription(
      'Enter a phone number with digits only, 4 to 14 digits after the country code.',
    );
    expect(
      screen.getByLabelText('Anything to share beforehand? (Optional)'),
    ).toHaveAccessibleDescription('Keep your note under 1000 characters.');
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('First name')).toHaveFocus();
    expect(chosenCall()).toBe(callBefore);
  });

  it('offers no birth date that would make the visitor under 18 on the booking day', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await user.click(screen.getByLabelText('Date of birth'));

    // act
    await chooseOption(user, 'Year', '2008');
    await chooseOption(user, 'Month', 'March');

    // assert
    expect(calendarDayButton('2008-03-03')).toBeDisabled();
    expect(calendarDayButton('2008-03-02')).toBeEnabled();
    expect(screen.queryByRole('option', { name: '2009' })).toBeNull();

    // act
    await user.click(calendarDayButton('2008-03-02'));

    // assert
    expect(screen.getByLabelText('Date of birth')).toHaveTextContent('2 March 2008');
  });

  it('moves focus to the first rejected detail', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await fillDetails(user);
    await user.clear(screen.getByLabelText('Email Address'));
    await user.type(screen.getByLabelText('Email Address'), 'not-an-address');

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

    // assert
    expect(screen.getByLabelText('Email Address')).toHaveFocus();
  });

  it('preselects the calling code from the country and books without a phone', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);

    // act
    await fillDetails(user);

    // assert
    expect(
      screen.getByRole('combobox', { name: 'Country calling code' }),
    ).toHaveTextContent('+40 RO');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: "You're booked!" }, BOOKING_WAIT),
    ).toBeInTheDocument();
  });

  it('keeps every detail when the visitor goes back to the times and returns', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await fillDetails(user);
    await user.type(screen.getByLabelText('Phone number'), '0712 345 678');

    // act
    await user.click(screen.getByRole('button', { name: 'Back to the times' }));
    await user.click(
      await screen.findByRole('button', { name: 'Continue to your details' }),
    );
    await screen.findByRole('heading', { level: 2, name: 'Almost there' });

    // assert
    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
    expect(screen.getByLabelText('Date of birth')).toHaveTextContent('14 March 1994');
    expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveTextContent('Female');
    expect(screen.getByRole('combobox', { name: 'Primary goal' })).toHaveTextContent(
      'Build strength',
    );
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Romania');
    expect(screen.getByLabelText('Phone number')).toHaveValue('0712 345 678');
  });

  it('confirms a booked call with its time, length and a way to join it, naming no zone', async () => {
    // arrange
    const user = renderBook();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

    // assert
    expect(
      await screen.findByRole('heading', { level: 2, name: "You're booked!" }, BOOKING_WAIT),
    ).toHaveFocus();
    expect(
      screen.getByText(/A confirmation with your join link is on its way to/),
    ).toHaveTextContent('jane@example.com');
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) =>
          element?.tagName === 'P' && /\d{1,2}:\d{2}\s?(AM|PM)\s*$/i.test(content),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(VISITOR_TIME_ZONE.replace('/', '\\/')))).toBeNull();
    expect(screen.queryByText(/GMT/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Join the call' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Home' })).toHaveAttribute('href', '/');
  });

  it('returns to the times with an explanation when the chosen one was taken', async () => {
    // arrange
    const user = renderBook('?booking=slot_unavailable');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

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
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

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
    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
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
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

    // assert
    const alert = await screen.findByRole('alert', {}, BOOKING_WAIT);
    expect(alert).toHaveTextContent(/went wrong on our end/i);
    expect(screen.getByRole('link', { name: 'contact@evoa.fit' })).toHaveAttribute(
      'href',
      'mailto:contact@evoa.fit',
    );
    expect(screen.getByRole('button', { name: 'Schedule Call' })).toBeEnabled();
  });

  it('rejects an email the server will not accept, without losing the details', async () => {
    // arrange
    const user = renderBook('?booking=invalid_email');
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole('button', { name: 'Schedule Call' }));

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
