import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevToggle } from '../DevToggle';
import { Toaster } from '../ui/sonner';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider, useCheckins } from '../../context/CheckinContext';
import { ClientJourneyProvider, useClientJourneys } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { CoachProfileProvider } from '../../context/CoachProfileContext';
import { MessagingProvider } from '../../context/MessagingContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { checkinSlotAt } from '../../domain/checkins';
import { weekStartsBetween } from '../../domain/checkinSeries';
import { WeeklyCheckinPanel } from './WeeklyCheckinPanel';

const SERVICE_TIMEOUT = { timeout: 4000 };
const COACH_ZONE = 'Europe/Bucharest';
const SET_UP_DIALOG = 'Set up a weekly check-in with Jane';
const CHANGE_DIALOG = 'Change the weekly check-in';
const AWAITING_ONBOARDING_REASON = 'She can answer a check-in once she has sent her onboarding.';
const DAY_MS = 24 * 60 * 60_000;

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  toast.dismiss();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

function nextMondayAtSix(): Date {
  const from = new Date(Date.now() + DAY_MS);
  const [start] = weekStartsBetween(
    { weekday: 1, hour: 18, timeZone: COACH_ZONE },
    { from, until: new Date(from.getTime() + 7 * DAY_MS) },
  );

  return start;
}

function DemoPanel() {
  const { demoJourney } = useClientJourneys();
  const { coachInitiateCheckin } = useCheckins();

  return (
    <>
      <WeeklyCheckinPanel journey={demoJourney} />
      <button
        type="button"
        onClick={() =>
          coachInitiateCheckin({
            clientId: 'c2',
            clientName: 'Jessica Alba',
            ...checkinSlotAt(nextMondayAtSix()),
          })
        }
      >
        stand in for another check-in on Monday at 18:00
      </button>
    </>
  );
}

function renderPanel(urlQuery: string) {
  const path = `/coach/clients/ac-demo-client-1?session=coach&${urlQuery}`;
  window.history.replaceState({}, '', path);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <CoachProfileProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <CheckinProvider>
                  <MessagingProvider>
                    <NotificationProvider>
                      <DemoPanel />
                      <Toaster />
                      <DevToggle />
                    </NotificationProvider>
                  </MessagingProvider>
                </CheckinProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </CoachProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function panel(): HTMLElement {
  return screen.getByRole('region', { name: 'Weekly check-in' });
}

async function chooseWeeklySeries(user: ReturnType<typeof userEvent.setup>, state: string) {
  await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
  await user.click(screen.getByRole('tab', { name: 'Check-ins' }));
  await user.click(screen.getByRole('combobox', { name: 'Weekly series' }));
  await user.click(await screen.findByRole('option', { name: state }));
  await user.click(screen.getByRole('button', { name: 'Close Dev Settings' }));
}

async function openedDialog(name: string): Promise<HTMLElement> {
  const dialog = await screen.findByRole('dialog', { name });
  await within(dialog).findByRole('list', { name: 'Hour' }, SERVICE_TIMEOUT);

  return dialog;
}

function hourButton(dialog: HTMLElement, hour: string): HTMLElement {
  return within(dialog).getByRole('button', { name: new RegExp(`^${hour}`) });
}

describe('the weekly check-in panel on a client record', () => {
  it('offers Set up while she has no weekly check-in', () => {
    // arrange
    const urlQuery = 'jstage=submitted';

    // act
    renderPanel(urlQuery);

    // assert
    expect(within(panel()).getByText('No weekly check-in yet.')).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Set up' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('holds Set up back before she sends her onboarding and says why', async () => {
    // arrange
    const user = renderPanel('jstage=onboarding');
    const setUp = within(panel()).getByRole('button', { name: 'Set up' });

    // act
    await user.hover(setUp);
    await user.click(setUp);

    // assert
    expect(setUp).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByText(AWAITING_ONBOARDING_REASON)).toBeVisible();
    expect(screen.queryByRole('dialog', { name: SET_UP_DIALOG })).not.toBeInTheDocument();
  });

  it.each([
    { subscription: 'cancelled', line: 'Her coaching is ending, so no weekly check-in can be set up.' },
    { subscription: 'ended', line: 'Her coaching has ended, so no weekly check-in can be set up.' },
  ])('offers nothing once her coaching is $subscription and says why', ({ subscription, line }) => {
    // arrange
    const urlQuery = `jstage=submitted&jsub=${subscription}`;

    // act
    renderPanel(urlQuery);

    // assert
    expect(within(panel()).getByText(line)).toBeInTheDocument();
    expect(within(panel()).queryByText('No weekly check-in yet.')).not.toBeInTheDocument();
    expect(within(panel()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides her weekly check-in and its actions once her coaching is cancelled', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'Active');

    // act
    await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
    await user.click(screen.getByRole('tab', { name: 'Journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Subscription state' }));
    await user.click(await screen.findByRole('option', { name: 'Cancelled' }));
    await user.click(screen.getByRole('button', { name: 'Close Dev Settings' }));

    // assert
    expect(
      within(panel()).getByText('Her coaching is ending, so no weekly check-in can be set up.'),
    ).toBeInTheDocument();
    expect(within(panel()).queryByText('Every Wednesday at 6:00 PM')).not.toBeInTheDocument();
    expect(within(panel()).queryByRole('list', { name: 'Weeks to come' })).not.toBeInTheDocument();
    expect(within(panel()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the day, the hour and every week still to come', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');

    // act
    await chooseWeeklySeries(user, 'Active');

    // assert
    expect(within(panel()).getByText('Every Wednesday at 6:00 PM')).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    const weeks = within(within(panel()).getByRole('list', { name: 'Weeks to come' })).getAllByRole(
      'listitem',
    );
    expect(weeks.length).toBeGreaterThan(1);
    expect(within(panel()).queryByText('Clash')).not.toBeInTheDocument();
  });

  it('flags the weeks whose hour is taken and lets the coach reschedule or cancel them', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'With clashes');
    const weeks = within(within(panel()).getByRole('list', { name: 'Weeks to come' })).getAllByRole(
      'listitem',
    );
    const [firstWeek] = weeks;

    // act
    await user.click(within(firstWeek).getByRole('button', { name: /^More actions/ }));

    // assert
    expect(within(panel()).getAllByText('Clash')).toHaveLength(2);
    expect(within(firstWeek).getByText('Finding a new time')).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Reschedule' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('reads as having no weekly check-in once it stopped', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');

    // act
    await chooseWeeklySeries(user, 'Stopped');

    // assert
    expect(within(panel()).getByText('No weekly check-in yet.')).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Set up' })).toBeInTheDocument();
  });
});

describe('setting up a weekly check-in', () => {
  it('prefills her onboarding day and offers the hours inside the availability', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');

    // act
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));

    // assert
    const dialog = await openedDialog(SET_UP_DIALOG);
    expect(dialog).toHaveAccessibleDescription(
      'Pick the day and hour. Every week until her paid period ends is booked.',
    );
    expect(within(dialog).getByRole('radio', { name: 'Monday' })).toBeChecked();
    expect(
      within(within(dialog).getByRole('list', { name: 'Hour' }))
        .getAllByRole('button')
        .map((hour) => hour.textContent),
    ).toEqual(['5:00 PM', '6:00 PM', '7:00 PM']);
    expect(within(dialog).getByRole('button', { name: 'Set up' })).toBeDisabled();
  });

  it('counts the weeks that would clash at each hour', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await user.click(screen.getByRole('button', { name: /^stand in for another check-in/ }));

    // act
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));

    // assert
    const dialog = await openedDialog(SET_UP_DIALOG);
    expect(hourButton(dialog, '6:00 PM')).toHaveTextContent(/^6:00 PM 1 clash$/);
    expect(hourButton(dialog, '5:00 PM')).toHaveTextContent(/^5:00 PM$/);
  });

  it('reloads the hours for another weekday', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await user.click(screen.getByRole('button', { name: /^stand in for another check-in/ }));
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));
    const dialog = await openedDialog(SET_UP_DIALOG);

    // act
    await user.click(within(dialog).getByRole('radio', { name: 'Wednesday' }));

    // assert
    expect(within(dialog).getByRole('radio', { name: 'Wednesday' })).toBeChecked();
    await waitFor(
      () => expect(hourButton(dialog, '6:00 PM')).toHaveTextContent(/^6:00 PM$/),
      SERVICE_TIMEOUT,
    );
  });

  it('books every week, says so and lists them on the panel', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));
    const dialog = await openedDialog(SET_UP_DIALOG);
    await user.click(hourButton(dialog, '6:00 PM'));

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Set up' }));

    // assert
    expect(within(dialog).getByRole('button', { name: 'Setting up…' })).toBeDisabled();
    expect(await screen.findByText('Weekly check-in set up', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: SET_UP_DIALOG })).not.toBeInTheDocument();
    expect(within(panel()).getByText('Every Monday at 6:00 PM')).toBeInTheDocument();
    expect(within(panel()).getByRole('list', { name: 'Weeks to come' })).toBeInTheDocument();
  });

  it('says when she cannot have a weekly check-in right now', async () => {
    // arrange
    const user = renderPanel('jstage=submitted&ckservice=cannot-answer');
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));
    const dialog = await openedDialog(SET_UP_DIALOG);
    await user.click(hourButton(dialog, '5:00 PM'));

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Set up' }));

    // assert
    expect(
      await within(dialog).findByText("Jane can't have a weekly check-in right now.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(dialog).toBeVisible();
  });

  it('offers to try again when the hours cannot be loaded', async () => {
    // arrange
    const user = renderPanel('jstage=submitted&ckservice=fails');

    // act
    await user.click(within(panel()).getByRole('button', { name: 'Set up' }));

    // assert
    const dialog = await screen.findByRole('dialog', { name: SET_UP_DIALOG });
    expect(
      await within(dialog).findByText("We couldn't load the hours just now.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('changing and stopping a weekly check-in', () => {
  it('opens on her current day and hour rather than her onboarding day', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'Active');

    // act
    await user.click(within(panel()).getByRole('button', { name: 'Change' }));

    // assert
    const dialog = await openedDialog(CHANGE_DIALOG);
    expect(within(dialog).getByRole('radio', { name: 'Wednesday' })).toBeChecked();
    expect(hourButton(dialog, '6:00 PM')).toHaveAttribute('aria-pressed', 'true');
    expect(dialog).toHaveAccessibleDescription('Every week from the next Wednesday is moved.');
    expect(within(dialog).getByRole('button', { name: 'Change' })).toBeEnabled();
  });

  it('moves every week to come to the new day and hour', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'Active');
    await user.click(within(panel()).getByRole('button', { name: 'Change' }));
    const dialog = await openedDialog(CHANGE_DIALOG);
    await user.click(within(dialog).getByRole('radio', { name: 'Monday' }));
    await waitFor(() => expect(hourButton(dialog, '5:00 PM')).toBeInTheDocument(), SERVICE_TIMEOUT);
    await user.click(hourButton(dialog, '5:00 PM'));

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Change' }));

    // assert
    expect(dialog).toHaveAccessibleDescription('Every week from the next Monday is moved.');
    expect(await screen.findByText('Weekly check-in changed', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(within(panel()).getByText('Every Monday at 5:00 PM')).toBeInTheDocument();
  });

  it('asks before stopping, then cancels every week to come', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'Active');
    await user.click(within(panel()).getByRole('button', { name: 'Stop' }));
    const confirm = await screen.findByRole('dialog', { name: 'Stop the weekly check-in?' });

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Stop' }));

    // assert
    expect(confirm).toHaveAccessibleDescription(
      'Every week still to come is cancelled and Jane is told.',
    );
    expect(await screen.findByText('Weekly check-in stopped', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(within(panel()).getByText('No weekly check-in yet.')).toBeInTheDocument();
  });

  it('keeps the weekly check-in when the coach keeps it', async () => {
    // arrange
    const user = renderPanel('jstage=submitted');
    await chooseWeeklySeries(user, 'Active');
    await user.click(within(panel()).getByRole('button', { name: 'Stop' }));
    const confirm = await screen.findByRole('dialog', { name: 'Stop the weekly check-in?' });

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Keep' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Stop the weekly check-in?' })).not.toBeInTheDocument();
    expect(within(panel()).getByText('Every Wednesday at 6:00 PM')).toBeInTheDocument();
  });
});
