import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClientSettings } from './ClientSettings';
import { PortalEnded } from './PortalEnded';
import { PaymentMethodStandIn } from '../PaymentMethodStandIn';
import { ClientJourneyGate } from '../../components/client-portal/ClientJourneyGate';
import { DevToggle } from '../../components/DevToggle';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';

const SERVICE_TIMEOUT = 4000;

const ENDED_REFUND_LINE =
  'Eli will refund you in the next few days; it reaches your card within 5–10 business days.';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
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
  window.history.replaceState({}, '', '/');
});

function renderSettings(devParams: string) {
  const url = `/portal/settings?session=client&jstage=submitted&${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <UnitPreferencesProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <CheckinProvider>
                    <Routes>
                      <Route element={<ClientJourneyGate />}>
                        <Route element={<p>portal home</p>} path="/portal" />
                        <Route
                          element={<ClientSettings />}
                          path="/portal/settings"
                        />
                        <Route element={<PortalEnded />} path="/portal/ended" />
                        <Route
                          element={<PaymentMethodStandIn />}
                          path="/billing/payment-method"
                        />
                      </Route>
                    </Routes>
                    <DevToggle />
                    <Toaster />
                  </CheckinProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </UnitPreferencesProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function subscriptionSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Subscription' });
}

function cancellationRow(): HTMLElement {
  const title = within(subscriptionSection()).getByText('Cancellation');
  const row = title.closest('[data-parity="subscription-cancellation"]');
  if (!(row instanceof HTMLElement)) throw new Error('No cancellation row');

  return row;
}

describe('the subscription section', () => {
  it('shows her plan and that it renews once her program starts', () => {
    // arrange
    renderSettings('jstart=waiting');

    // act
    const section = subscriptionSection();

    // assert
    expect(within(section).getByText('3 months of coaching')).toBeVisible();
    expect(
      within(section).getByText(
        /^Paid \d{1,2} \w+ · starts when your program is ready\.$/,
      ),
    ).toBeVisible();
    expect(
      within(section).getByText('Renews once your program starts'),
    ).toBeVisible();
    expect(
      within(section).getByText('Your first term runs from your start date.'),
    ).toBeVisible();
  });

  it('offers a full refund on the waiting path within the 14 days', () => {
    // arrange
    renderSettings('jstart=waiting');

    // act
    const row = cancellationRow();

    // assert
    expect(
      within(row).getByText(
        /^Until \d{1,2} \w+ you can cancel for a full refund\. Your access ends right away\.$/,
      ),
    ).toBeVisible();
    expect(
      within(row).getByRole('button', { name: 'Cancel and get a full refund' }),
    ).toBeVisible();
  });

  it('offers a refund on the immediate path within the 14 days', () => {
    // arrange
    renderSettings('jstart=immediate');

    // act
    const row = cancellationRow();

    // assert
    expect(
      within(row).getByText(
        /^Until \d{1,2} \w+ you can cancel for a refund: all of it before your program starts, or the unused part of your first term once it has\. Your access ends right away\.$/,
      ),
    ).toBeVisible();
    expect(
      within(row).getByRole('button', { name: 'Cancel and get a refund' }),
    ).toBeVisible();
  });

  it('offers to cancel without a refund once the withdrawal right is gone', () => {
    // arrange
    renderSettings('jstart=waiting&jpaid=14');

    // act
    const row = cancellationRow();

    // assert
    expect(
      within(row).getByText(
        /^You won't be charged again, there is no refund for the coaching already paid, and your access stays until \d{1,2} \w+\.$/,
      ),
    ).toBeVisible();
    expect(
      within(row).getByRole('button', { name: 'Cancel subscription' }),
    ).toBeVisible();
  });

  it('shows a cancelled subscription with its access date and no further actions', () => {
    // arrange
    renderSettings('jsub=cancelled&jpaid=30');

    // act
    const section = subscriptionSection();

    // assert
    expect(
      within(section).getByText(/^Paid \d{1,2} \w+ · cancelled \d{1,2} \w+\.$/),
    ).toBeVisible();
    expect(within(section).getByText(/^Access until \d{1,2} \w+$/)).toBeVisible();
    expect(within(section).getByText("You won't be charged again.")).toBeVisible();
    expect(within(section).queryByText('Cancellation')).not.toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: 'Manage payment method' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the units section on the page', () => {
    // arrange
    renderSettings('jstart=waiting');

    // act
    const units = screen.getByRole('region', { name: 'Units & Measurements' });

    // assert
    expect(units).toBeVisible();
  });
});

describe('the cancel dialogs', () => {
  it('names the action and its consequence for the full refund', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');

    // act
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a full refund' }),
    );

    // assert
    const dialog = screen.getByRole('dialog', {
      name: 'Cancel and get a full refund',
    });
    expect(dialog).toHaveAccessibleDescription(
      "You'll get a full refund and your access ends right away.",
    );
    expect(
      within(dialog).getByRole('button', { name: 'Cancel and get a full refund' }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Keep my coaching' }),
    ).toBeVisible();
  });

  it('names the refund amount for the proportional refund', async () => {
    // arrange
    const user = renderSettings('jstart=immediate');

    // act
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a refund' }),
    );

    // assert
    expect(
      screen.getByRole('dialog', { name: 'Cancel and get a refund' }),
    ).toHaveAccessibleDescription(
      "You'll get €447.00 back and your access ends right away.",
    );
  });

  it('repeats the facts for the cancellation without a refund', async () => {
    // arrange
    const user = renderSettings('jpaid=14');

    // act
    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));

    // assert
    expect(
      screen.getByRole('dialog', { name: 'Cancel subscription' }),
    ).toHaveAccessibleDescription(
      /^You won't be charged again, there is no refund for the coaching already paid, and your access stays until \d{1,2} \w+\.$/,
    );
  });

  it('keeps her coaching and returns focus to the action', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    const action = screen.getByRole('button', {
      name: 'Cancel and get a full refund',
    });
    await user.click(action);

    // act
    await user.click(screen.getByRole('button', { name: 'Keep my coaching' }));

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(action).toHaveFocus();
    expect(cancellationRow()).toBeVisible();
  });

  it('closes on Escape', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a full refund' }),
    );

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: 'Cancel and get a full refund' }),
    ).toHaveFocus();
  });

  it('keeps focus inside the dialog', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a full refund' }),
    );
    const dialog = screen.getByRole('dialog');

    // act
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    // assert
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});

describe('cancelling', () => {
  it('ends a refundable subscription and shows the refund on its way', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a full refund' }),
    );

    // act
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel and get a full refund',
      }),
    );

    // assert
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Your coaching has ended' },
        { timeout: SERVICE_TIMEOUT },
      ),
    ).toBeVisible();
    expect(screen.getByText('It was good to train together.')).toBeVisible();
    expect(screen.getByText(ENDED_REFUND_LINE)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps access after a cancellation without a refund', async () => {
    // arrange
    const user = renderSettings('jpaid=14');
    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));

    // act
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel subscription',
      }),
    );

    // assert
    expect(
      await screen.findByText(/^Access until \d{1,2} \w+$/, undefined, {
        timeout: SERVICE_TIMEOUT,
      }),
    ).toBeVisible();
    expect(
      await screen.findByText(
        /^Subscription cancelled\. Your access stays until \d{1,2} \w+\.$/,
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 2, name: 'Subscription' }),
      ).toHaveFocus(),
    );
  });

  it('asks her to try again when the cancellation fails', async () => {
    // arrange
    const user = renderSettings('jcancel=fails');
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a refund' }),
    );

    // act
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel and get a refund',
      }),
    );

    // assert
    expect(
      await within(screen.getByRole('dialog')).findByRole(
        'alert',
        {},
        { timeout: SERVICE_TIMEOUT },
      ),
    ).toHaveTextContent(
      "Your coaching couldn't be cancelled just now. Nothing has changed, so please try again.",
    );
    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Keep my coaching',
      }),
    ).toBeVisible();
  });

  it('tells her the coaching has already ended, then shows the ended page', async () => {
    // arrange
    const user = renderSettings('jcancel=already-ended');
    await user.click(
      screen.getByRole('button', { name: 'Cancel and get a refund' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel and get a refund',
      }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByRole(
        'alert',
        {},
        { timeout: SERVICE_TIMEOUT },
      ),
    ).toHaveTextContent(
      'This coaching has already ended, so there is nothing to cancel.',
    );

    // act
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // assert
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your coaching has ended',
      }),
    ).toBeVisible();
    expect(screen.queryByText(ENDED_REFUND_LINE)).not.toBeInTheDocument();
  });

  it('switches the refund rule after she lets Eli start now', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Start path' }));
    await user.click(await screen.findByRole('option', { name: 'Immediate start' }));

    // assert
    expect(
      within(cancellationRow()).getByRole('button', {
        name: 'Cancel and get a refund',
      }),
    ).toBeVisible();
  });
});

describe('the payment method', () => {
  it('lets her manage her payment method', () => {
    // arrange
    renderSettings('jstart=waiting');

    // act
    const section = subscriptionSection();

    // assert
    expect(within(section).getByText('Payment method')).toBeVisible();
    expect(
      within(section).getByText('The card your coaching renews on.'),
    ).toBeVisible();
    expect(
      within(section).queryByText('Payment problem'),
    ).not.toBeInTheDocument();
  });

  it('announces a payment problem', () => {
    // arrange
    renderSettings('jpayproblem=1&jpaid=30');

    // act
    const status = within(subscriptionSection()).getByRole('status');

    // assert
    expect(status).toHaveTextContent(
      "Payment problemYour last payment didn't go through. Update your card to keep your coaching going.",
    );
  });

  it('hands her over to update her card and brings her back to Settings', async () => {
    // arrange
    const user = renderSettings('jpayproblem=1&jpaid=30');
    await user.click(
      screen.getByRole('button', { name: 'Manage payment method' }),
    );
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Update your card' },
      { timeout: SERVICE_TIMEOUT },
    );

    // act
    await user.click(screen.getByRole('button', { name: 'Save card' }));

    // assert
    expect(
      await screen.findByRole(
        'region',
        { name: 'Subscription' },
        { timeout: SERVICE_TIMEOUT },
      ),
    ).toBeVisible();
    expect(screen.queryByText('Payment problem')).not.toBeInTheDocument();
  });

  it('asks her to try again when the hand-off fails', async () => {
    // arrange
    const user = renderSettings('jpayportal=fails');

    // act
    await user.click(
      screen.getByRole('button', { name: 'Manage payment method' }),
    );

    // assert
    expect(
      await within(subscriptionSection()).findByRole(
        'alert',
        {},
        { timeout: SERVICE_TIMEOUT },
      ),
    ).toHaveTextContent(
      "Your payment details couldn't be opened just now. Please try again.",
    );
  });

  it('raises the payment problem from the Dev Toggle', async () => {
    // arrange
    const user = renderSettings('jstart=waiting');
    await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
    await user.click(screen.getByRole('tab', { name: 'Journey' }));

    // act
    await user.click(screen.getByRole('checkbox', { name: 'Payment problem' }));

    // assert
    expect(
      within(subscriptionSection()).getByRole('status'),
    ).toHaveTextContent(/^Payment problem/);
    expect(window.location.search).toContain('jpayproblem=1');
  });
});
