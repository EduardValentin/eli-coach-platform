import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
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

function renderList(urlQuery = '') {
  window.history.replaceState({}, '', `/coach/clients${urlQuery}`);

  render(
    <MemoryRouter initialEntries={[`/coach/clients${urlQuery}`]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ClientsList />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
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

describe('the coach clients list', () => {
  it('offers Onboarding beside the roster filters', () => {
    // arrange
    const urlQuery = '';

    // act
    renderList(urlQuery);

    // assert
    for (const label of ['All', 'Active', 'Inactive', 'Onboarding']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('shows nobody under Onboarding while every journey is finished', async () => {
    // arrange
    const user = renderList();

    // act
    await user.click(screen.getByRole('button', { name: 'Onboarding' }));

    // assert
    expect(
      screen.getByText('No clients found matching your criteria.'),
    ).toBeInTheDocument();
  });

  it('lists a client who is still onboarding by name and email alone', async () => {
    // arrange
    const user = renderList('?jstage=submitted');

    // act
    await user.click(screen.getByRole('button', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(within(row).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(row).queryByText('Sent to coach')).not.toBeInTheDocument();
    expect(within(row).queryByText('Immediate start')).not.toBeInTheDocument();
  });

  it('keeps the day a waiting client starts off her row', async () => {
    // arrange
    const user = renderList('?jstage=submitted&jstart=waiting');

    // act
    await user.click(screen.getByRole('button', { name: 'Onboarding' }));

    // assert
    expect(within(rowFor('Jane Doe')).queryByText('Starts on 30 September'))
      .not.toBeInTheDocument();
  });

  it('opens her onboarding from the row once it is waiting on the coach', async () => {
    // arrange
    const user = renderList('?jstage=submitted');

    // act
    await user.click(screen.getByRole('button', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(
      within(row).getByRole('link', { name: 'Review onboarding' }),
    ).toHaveAttribute('href', '/coach/clients/c1');
  });

  it('keeps the review action off a row she has not sent yet', async () => {
    // arrange
    const user = renderList('?jstage=onboarding');

    // act
    await user.click(screen.getByRole('button', { name: 'Onboarding' }));

    // assert
    const row = rowFor('Jane Doe');
    expect(
      within(row).queryByRole('link', { name: 'Review onboarding' }),
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
      within(rowFor('Jane Doe')).getByRole('link', { name: 'Review onboarding' }),
    ).toBeInTheDocument();
  });

  it('keeps the roster working when nothing is onboarding', async () => {
    // arrange
    const user = renderList();

    // act
    await user.click(screen.getByRole('button', { name: 'Inactive' }));

    // assert
    const names = listedNames();
    expect(names.some((name) => name.includes('Sarah Jenkins'))).toBe(true);
    expect(names.some((name) => name.includes('Jane Doe'))).toBe(false);
  });
});
