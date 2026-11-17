import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
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

function programTree(url: string) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
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
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>
  );
}

function renderProgram(seed: string, extra = '') {
  const url = `/portal/program?session=client&pseed=${seed}&jstage=program-ready${extra}`;
  window.history.replaceState({}, '', url);
  const { rerender } = render(programTree(url));
  return { rerender: () => rerender(programTree(url)) };
}

function follows(earlier: HTMLElement, later: HTMLElement): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('the client Program page', () => {
  it('answers what to do today on the first screen, with the plan after the week', async () => {
    // arrange
    renderProgram('published');

    // act
    const heading = await screen.findByRole('heading', { level: 1, name: 'Program' });

    // assert
    expect(heading).toBeInTheDocument();
    const week = screen.getByRole('region', { name: /^Week 1 of 11/ });
    const today = within(week).getByRole('tab', { selected: true });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(today).toHaveAccessibleName(/^Wednesday 23 September, .+, today/);
    expect(within(week).getAllByRole('tab')).toHaveLength(7);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(follows(week, screen.getByRole('region', { name: 'Plan' }))).toBe(true);
    expect(screen.getByRole('link', { name: /^PDF ?: download version 1$/ })).toHaveAttribute('href', '/portal/program/document');
  });

  it('renders only the selected day', async () => {
    // arrange
    const user = userEvent.setup();
    renderProgram('published');
    const tabs = await screen.findAllByRole('tab');
    const other = tabs.find(tab => tab.getAttribute('aria-selected') === 'false' && !/, Rest/.test(tab.textContent ?? ''));
    if (!other) throw new Error('no other training day');

    // act
    await user.click(other);

    // assert
    expect(other).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(within(screen.getByRole('tabpanel')).getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('tells her what changed in the new version until she dismisses it', async () => {
    // arrange
    const user = userEvent.setup();
    renderProgram('two-versions');
    const notice = await screen.findByText(/^What changed in version 2\./);

    // act
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    // assert
    expect(notice).not.toBeInTheDocument();
  });

  it('loads the block text only once the split name is opened', async () => {
    // arrange
    const user = userEvent.setup();
    renderProgram('published');
    await screen.findByRole('heading', { level: 1, name: 'Program' });
    expect(screen.queryByText(/Foundation block — building your base/)).toBeNull();

    // act
    await user.click(screen.getByRole('button', { name: 'Full Body' }));

    // assert
    expect(screen.getByText(/Foundation block — building your base/)).toBeInTheDocument();
  });

  it('shows the last week of the plan, without a today, once the plan has ended', async () => {
    // arrange
    const { rerender } = renderProgram('two-versions');
    await screen.findByRole('heading', { level: 1, name: 'Program' });

    // act
    vi.setSystemTime(AFTER_THE_PLAN);
    rerender();

    // assert
    const week = screen.getByRole('region', { name: /^Week 11 of 11/ });
    expect(within(week).getByText(/^Ended \d+ \w+$/)).toBeInTheDocument();
    expect(within(week).getAllByRole('tab').some(tab => tab.hasAttribute('aria-current'))).toBe(false);
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

  it('lists her published versions with their PDFs and leaves the coach’s draft out', async () => {
    // arrange
    renderProgram('two-versions');

    // act
    const versions = within(await screen.findByRole('region', { name: 'Versions' })).getAllByRole('listitem');

    // assert
    expect(versions).toHaveLength(2);
    expect(versions[0]).toHaveTextContent(/^Version 2/);
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
    expect(screen.queryByText('Superseded')).not.toBeInTheDocument();
    expect(within(versions[1]).getByRole('link', { name: /^Download PDF ?, version 1$/ })).toHaveAttribute('href', '/portal/program/document/1');
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('says the program could not be loaded and loads it again on Try again', async () => {
    // arrange
    const user = userEvent.setup();
    renderProgram('published', '&pload=failed');
    await screen.findByText("The program couldn't be loaded");

    // act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // assert
    expect(screen.getByRole('region', { name: /^Week 1 of 11/ })).toBeInTheDocument();
  });
});
