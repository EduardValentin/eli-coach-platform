import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { ClientProgram } from './ClientProgram';

const WEDNESDAY_OF_WEEK_ONE = new Date(2026, 8, 23, 10);
const AFTER_THE_PLAN = new Date(2026, 11, 10, 10);

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(WEDNESDAY_OF_WEEK_ONE);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderProgram(seed: string) {
  const url = `/portal/program?session=client&pseed=${seed}&jstage=program-ready`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <UnitPreferencesProvider>
              <AssessmentCallProvider>
                <ClientJourneyProvider>
                  <ProgramProvider>
                    <Routes>
                      <Route element={<ClientProgram />} path="/portal/program" />
                      <Route element={<p>document page</p>} path="/portal/program/document" />
                    </Routes>
                  </ProgramProvider>
                </ClientJourneyProvider>
              </AssessmentCallProvider>
            </UnitPreferencesProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('the client Program page', () => {
  it('answers what to do today on the first screen', async () => {
    // arrange
    renderProgram('published');

    // act
    const heading = await screen.findByRole('heading', { level: 1, name: 'Program' });
    const tabs = screen.getByRole('tablist', { name: 'This week' });
    const today = within(tabs).getByRole('tab', { selected: true });
    const panel = screen.getByRole('tabpanel');

    // assert
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/Foundation · week 1 of 11/)).toBeInTheDocument();
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(today).toHaveTextContent('Wed 23');
    expect(within(tabs).getAllByRole('tab')).toHaveLength(7);
    expect(within(panel).getAllByRole('table')).toHaveLength(1);
    expect(within(panel).getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('href', '/portal/program/document');
    expect(screen.queryByRole('heading', { name: 'About this block' })).toBeInTheDocument();
    expect(screen.queryByText(/Foundation block/)).toBeNull();
  });

  it('renders only the selected day', async () => {
    // arrange
    renderProgram('published');
    const tabs = await screen.findByRole('tablist', { name: 'This week' });
    const monday = within(tabs).getByRole('tab', { name: /^Mon 21/ });
    const thursday = within(tabs).getByRole('tab', { name: /^Thu 24/ });
    await userEvent.click(monday);
    const mondayPanel = screen.getByRole('tabpanel').textContent;

    // act
    await userEvent.click(thursday);

    // assert
    expect(thursday).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'program-day-panel-thu');
    expect(screen.getByRole('tabpanel').textContent).not.toBe(mondayPanel);
  });

  it('loads a collapsed section only once it is opened', async () => {
    // arrange
    renderProgram('published');
    await screen.findByRole('heading', { level: 1, name: 'Program' });
    expect(screen.queryByText(/Foundation block — building your base/)).toBeNull();

    // act
    await userEvent.click(screen.getByRole('button', { name: /About this block/ }));

    // assert
    expect(screen.getByText(/Foundation block — building your base/)).toBeInTheDocument();
  });

  it('lists the blocks of the plan under Your plan with the current one marked', async () => {
    // arrange
    renderProgram('published');
    await screen.findByRole('heading', { level: 1, name: 'Program' });

    // act
    await userEvent.click(screen.getByRole('button', { name: /Your plan/ }));

    // assert
    const current = screen.getByRole('listitem', { current: true });
    expect(current).toHaveTextContent(/^1\. Foundation · \d+ weeks · /);
    expect(screen.getAllByRole('listitem', { current: false }).length).toBeGreaterThan(0);
  });

  it('shows the ended state after the plan', async () => {
    // arrange
    renderProgram('two-versions');
    await screen.findByRole('heading', { level: 1, name: 'Program' });

    // act
    vi.setSystemTime(AFTER_THE_PLAN);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    // assert
    const tabs = screen.getByRole('tablist', { name: 'This week' });
    expect(screen.getByText('Your plan has ended, your coach is preparing the next version')).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { selected: true })).toHaveTextContent('Mon');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('shows the empty state before version 1', async () => {
    // arrange
    renderProgram('none');

    // act
    const title = await screen.findByText('Your program is on its way');

    // assert
    expect(title).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Program' })).toBeInTheDocument();
    expect(screen.getByText("Head to your plan whenever you're ready.")).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('keeps the previous version under Previous versions', async () => {
    // arrange
    renderProgram('two-versions');
    await screen.findByRole('heading', { level: 1, name: 'Program' });

    // act
    await userEvent.click(screen.getByRole('button', { name: /Previous versions/ }));

    // assert
    expect(screen.getByText(/^Version 1 · /)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Download PDF' }).map(link => link.getAttribute('href'))).toContain(
      '/portal/program/document/1',
    );
    expect(screen.getByText(/What changed in v2/)).toBeInTheDocument();
  });
});
