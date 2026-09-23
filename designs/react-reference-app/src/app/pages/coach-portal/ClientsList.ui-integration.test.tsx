import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientsList } from './ClientsList';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { TrainingProvider } from '../../context/TrainingContext';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

function LocationProbe() {
  const { search } = useLocation();
  return <p data-testid="location-probe">{search}</p>;
}

function renderList(urlQuery = '') {
  const url = `/coach/clients?scope=post-mvp&${urlQuery.replace(/^\?/, '')}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ClientsList />
                <LocationProbe />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function currentSearch(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function rowFor(name: string): HTMLElement {
  const cell = screen.getByText(name).closest('tr');
  if (!cell) throw new Error(`No row for ${name}`);
  return cell;
}

function listedNames(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

function orderedNames(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => {
      const nameCell = within(row).getAllByRole('cell')[0];
      return nameCell.querySelector('p')?.textContent ?? '';
    });
}

function statusSelect(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Status' });
}

function headerButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

describe('the coach clients list', () => {
  it('offers Onboarding beside the roster filters', () => {
    // arrange
    const urlQuery = '';

    // act
    renderList(urlQuery);

    // assert
    const tabs = within(screen.getByRole('tablist', { name: 'Show' }));
    for (const label of ['All', 'Active', 'Onboarding', 'Inactive']) {
      expect(tabs.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('shows nobody under Onboarding while every journey is finished', async () => {
    // arrange
    const user = renderList('?jstage=review-call-scheduled');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    expect(screen.getByText('No clients found')).toBeInTheDocument();
    expect(screen.getByText('No onboarding clients.')).toBeInTheDocument();
  });

  it('lists a client as soon as she has paid, with her bundle and the day she paid', async () => {
    // arrange
    const user = renderList('?jstage=paid');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(within(row).getByText('Paid')).toBeInTheDocument();
    expect(within(row).getByText('3 months')).toBeInTheDocument();
    expect(
      within(row).getByText(/^[A-Z][a-z]{2} \d{2}, \d{4}$/),
    ).toBeInTheDocument();
  });

  it('lists a client who is still onboarding with her name, email and onboarding status', async () => {
    // arrange
    const user = renderList('?jstage=submitted');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(within(row).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Awaiting review')).toBeInTheDocument();
    expect(within(row).queryByText('Immediate start')).not.toBeInTheDocument();
  });

  it('keeps the day a waiting client starts off her row', async () => {
    // arrange
    const user = renderList('?jstage=submitted&jstart=waiting');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    expect(
      within(rowFor('Jane Doe')).queryByText('Starts on 30 September'),
    ).not.toBeInTheDocument();
  });

  it('names the row arrow after the review waiting on the coach', async () => {
    // arrange
    const user = renderList('?jstage=submitted');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(
      within(row).getByRole('link', { name: 'Review onboarding for Jane Doe' }),
    ).toHaveAttribute('href', '/coach/clients/c1');
  });

  it('keeps the review wording off a row she has not sent yet', async () => {
    // arrange
    const user = renderList('?jstage=onboarding');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(
      within(row).queryByRole('link', { name: /^Review onboarding/ }),
    ).not.toBeInTheDocument();
    expect(
      within(row).getByRole('link', { name: 'View details for Jane Doe' }),
    ).toHaveAttribute('href', '/coach/clients/c1');
  });

  it('keeps an onboarding client out of the roster rows she has not reached yet', async () => {
    // arrange
    renderList('?jstage=submitted');

    // act
    const names = listedNames();

    // assert
    expect(names.filter((name) => name.includes('Jane Doe'))).toHaveLength(1);
    expect(
      within(rowFor('Jane Doe')).getByRole('link', {
        name: 'Review onboarding for Jane Doe',
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ['?jstage=paid', 'Paid'],
    ['?jstage=invited', 'Invited'],
    ['?jstage=account-created', 'Onboarding'],
    ['?jstage=onboarding', 'Onboarding'],
    ['?jstage=submitted', 'Awaiting review'],
    ['?jstage=reviewing', 'In review'],
    ['?jstage=needs-details', 'Needs details'],
    ['?jstage=approved', 'Approved'],
    ['?jstage=program-ready', 'Active'],
    ['?jstage=review-call-scheduled', 'Active'],
    ['?jstage=program-ready&jsub=cancelled', 'Cancelled'],
    ['?jstage=program-ready&jsub=ended', 'Inactive'],
  ])('reads %s back as %s on her row', (urlQuery, status) => {
    // arrange
    renderList(urlQuery);

    // act
    const row = rowFor('Jane Doe');

    // assert
    expect(within(row).getByText(status)).toBeInTheDocument();
  });

  it('keeps the roster tags in the one status vocabulary', () => {
    // arrange
    renderList();

    // act
    const inactive = rowFor('Sarah Jenkins');

    // assert
    expect(
      within(rowFor('Jessica Alba')).getByText('Active'),
    ).toBeInTheDocument();
    expect(within(inactive).getByText('Inactive')).toBeInTheDocument();
  });

  it('gathers everyone from her payment to her approval under Onboarding', async () => {
    // arrange
    const user = renderList('?jstage=approved');

    // act
    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));

    // assert
    expect(listedNames()).toHaveLength(1);
    expect(
      within(rowFor('Jane Doe')).getByText('Approved'),
    ).toBeInTheDocument();
  });

  it('files a client whose program is ready under Active', async () => {
    // arrange
    const user = renderList('?jstage=program-ready');

    // act
    await user.click(screen.getByRole('tab', { name: 'Active' }));

    // assert
    expect(within(rowFor('Jane Doe')).getByText('Active')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Onboarding' }));
    expect(screen.getByText('No clients found')).toBeInTheDocument();
    expect(screen.getByText('No onboarding clients.')).toBeInTheDocument();
  });

  it('files a client whose subscription has run out under Inactive', async () => {
    // arrange
    const user = renderList('?jstage=program-ready&jsub=ended');

    // act
    await user.click(screen.getByRole('tab', { name: 'Inactive' }));

    // assert
    expect(
      within(rowFor('Jane Doe')).getByText('Inactive'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Active' }));
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('keeps the roster working when nothing is onboarding', async () => {
    // arrange
    const user = renderList();

    // act
    await user.click(screen.getByRole('tab', { name: 'Inactive' }));

    // assert
    const names = listedNames();
    expect(names.some((name) => name.includes('Sarah Jenkins'))).toBe(true);
    expect(names.some((name) => name.includes('Jane Doe'))).toBe(false);
  });

  it('lists clients newest joined first by default', () => {
    // arrange
    renderList('?jstage=held');

    // act
    const names = orderedNames();

    // assert
    expect(names).toEqual([
      'Emma Stone',
      'Jessica Alba',
      'Jane Doe',
      'Mia Thermopolis',
      'Sarah Jenkins',
    ]);
  });

  it('flips the join date direction when its header is clicked', async () => {
    // arrange
    const user = renderList('?jstage=held');

    // act
    await user.click(headerButton('Join date'));

    // assert
    expect(orderedNames()).toEqual([
      'Sarah Jenkins',
      'Mia Thermopolis',
      'Jane Doe',
      'Jessica Alba',
      'Emma Stone',
    ]);
  });

  it('sorts by client name A to Z, then Z to A on a second click', async () => {
    // arrange
    const user = renderList('?jstage=held');

    // act
    await user.click(headerButton('Client'));

    // assert
    expect(orderedNames()).toEqual([
      'Emma Stone',
      'Jane Doe',
      'Jessica Alba',
      'Mia Thermopolis',
      'Sarah Jenkins',
    ]);

    // act
    await user.click(headerButton('Client'));

    // assert
    expect(orderedNames()).toEqual([
      'Sarah Jenkins',
      'Mia Thermopolis',
      'Jessica Alba',
      'Jane Doe',
      'Emma Stone',
    ]);
  });

  it('scopes the status count badges to the current view', async () => {
    // arrange
    const user = renderList('?jstage=held');

    // act
    await user.click(screen.getByRole('tab', { name: 'Active' }));
    await user.click(statusSelect());

    // assert
    expect(
      await screen.findByRole('option', { name: 'All statuses 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Active 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Inactive 0' }),
    ).toBeInTheDocument();
  });

  it('clears the view, status and search but keeps the sort', async () => {
    // arrange
    const user = renderList('?jstage=held');
    await user.click(headerButton('Client'));
    await user.click(screen.getByRole('tab', { name: 'Active' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search clients' }),
      'zzz',
    );
    expect(screen.getByText('No clients found')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(
      screen.getByRole('tab', { name: 'All', selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search clients' }),
    ).toHaveValue('');
    expect(currentSearch()).toContain('sort=name');
    expect(currentSearch()).not.toMatch(/[?&]view=/);
    expect(currentSearch()).not.toMatch(/[?&]status=/);
    expect(currentSearch()).not.toMatch(/[?&]q=/);
  });
});
