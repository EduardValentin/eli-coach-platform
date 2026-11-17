import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClientProgramPage } from './ClientProgramPage';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ProgramProvider } from '../../context/ProgramContext';
import { TrainingProvider } from '../../context/TrainingContext';

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
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function renderPage(clientId: string, query: string) {
  const url = `/coach/clients/${clientId}/program?session=coach${query}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <ProgramProvider>
                <Routes>
                  <Route path="/coach/clients/:id/program" element={<ClientProgramPage />} />
                </Routes>
              </ProgramProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function follows(earlier: HTMLElement, later: HTMLElement): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('ClientProgramPage', () => {
  it('heads the page with the way back to her record and the published version, without repeating her name', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Program$/);
    expect(screen.getByRole('link', { name: 'Back to Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');
    expect(screen.getByText(/^Version 2 · published \d+ \w+$/)).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe')).toHaveLength(1);
  });

  it('opens the current document and continues the draft from the header', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Open document' })).toHaveAttribute('href', '/coach/clients/c1/program/document/2');
    expect(within(header).getByRole('link', { name: 'Continue draft' })).toHaveAttribute('href', '/coach/clients/c1/program/draft');
  });

  it('puts the plan, with the plan week, the next check-in form and the weeks of each block, before the week', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const plan = screen.getByRole('region', { name: 'Plan' });
    const week = screen.getByRole('region', { name: /^Week 1 of 11/ });
    expect(follows(plan, week)).toBe(true);
    expect(within(plan).getAllByRole('term').map(term => term.textContent)).toEqual(['Plan', 'Next check-in form']);
    expect(within(plan).getByText('Week 1 of 11')).toBeInTheDocument();
    expect(within(plan).getByRole('button', { name: /^Show in the week card: Week 1 of 11, .+, this week$/ })).toHaveAttribute('aria-current', 'true');
  });

  it('opens the week named in the address', () => {
    // arrange
    const query = '&pseed=two-versions&week=5';

    // act
    renderPage('c1', query);

    // assert
    const week = screen.getByRole('region', { name: /^Week 5 of 11/ });
    expect(week).toHaveTextContent('Hypertrophy block, week 1 of 6');
    expect(within(week).getByRole('button', { name: 'This week' })).toBeInTheDocument();
  });

  it('offers the exercise library from the detail of an exercise', async () => {
    // arrange
    const user = userEvent.setup();
    renderPage('c1', '&pseed=two-versions');
    const [name] = within(screen.getByRole('tabpanel')).getAllByRole('button', { name: /: cues/ });

    // act
    await user.click(name);

    // assert
    const detail = screen.getByRole('dialog');
    expect(within(detail).getByRole('link', { name: 'Edit in exercise library' }).getAttribute('href')).toMatch(/^\/coach\/training\/exercises\/.+/);
  });

  it('lists every version with its state, what changed and the action the coach can take on it', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const versions = within(screen.getByRole('region', { name: 'Versions' })).getAllByRole('listitem');
    expect(versions).toHaveLength(3);
    expect(within(versions[0]).getByText('Draft')).toBeInTheDocument();
    expect(within(versions[0]).getByRole('link', { name: 'Continue draft' })).toHaveAttribute('href', '/coach/clients/c1/program/draft');
    expect(within(versions[1]).getByText('Published')).toBeInTheDocument();
    expect(within(versions[1]).getByText(/^Added a second lower day/)).toBeInTheDocument();
    expect(within(versions[1]).getByRole('link', { name: /^Open document ?, version 2$/ })).toHaveAttribute('href', '/coach/clients/c1/program/document/2');
    expect(within(versions[2]).getByText('Superseded')).toBeInTheDocument();
  });

  it('keeps the shape of the program while it loads', () => {
    // arrange
    const query = '&pseed=two-versions&pload=loading';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByRole('region', { name: 'Loading program' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading program');
    expect(screen.getByRole('link', { name: 'Back to Jane Doe' })).toBeInTheDocument();
  });

  it('says the program could not be loaded and loads it again on Try again', async () => {
    // arrange
    const user = userEvent.setup();
    renderPage('c1', '&pseed=two-versions&pload=failed');
    expect(screen.getByText("The program couldn't be loaded")).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // assert
    expect(screen.getByRole('region', { name: /^Week 1 of 11/ })).toBeInTheDocument();
  });

  it('points to the draft while no version is published', () => {
    // arrange
    const query = '&pseed=draft';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByText('No published version yet')).toBeInTheDocument();
    expect(screen.getByText('Version 1 is a draft. Jane sees her program once you publish it.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue draft' })).toHaveAttribute('href', '/coach/clients/c1/program/draft');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('says the client was not found when there is no program', () => {
    // arrange
    const query = '&pseed=none';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByText('Client not found')).toBeInTheDocument();
  });
});
