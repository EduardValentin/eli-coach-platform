import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClientProgramPage } from './ClientProgramPage';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
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
        <ClientProfileProvider>
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
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('ClientProgramPage', () => {
  it('summarises where she is in the published version', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Program' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Back to / })).toHaveAttribute('href', '/coach/clients/c1');
    const summary = screen.getByRole('region', { name: 'Plan' });
    expect(within(summary).getAllByRole('term').map(term => term.textContent)).toEqual(['Now', 'Next check-in form', 'Published']);
    const definitions = within(summary).getAllByRole('definition').map(definition => definition.textContent ?? '');
    expect(definitions[0]).toBe('Foundation · week 1 of 11');
    expect(definitions[1]).toMatch(/^\d+ \w+$/);
    expect(definitions[2]).toMatch(/^Version 2 · \d+ \w+$/);
  });

  it('marks today on the plan timeline', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const timeline = screen.getByRole('group', { name: 'Plan timeline' });
    expect(within(timeline).getByText('Today · week 1')).toBeInTheDocument();
  });

  it('names the exact date on the today marker and shows it in a tooltip on focus', async () => {
    // arrange
    const user = userEvent.setup();
    const exact = `${format(new Date(), 'd MMMM yyyy')} · week 1`;
    renderPage('c1', '&pseed=two-versions');
    const timeline = screen.getByRole('group', { name: 'Plan timeline' });
    const marker = within(timeline).getByRole('button', { name: new RegExp(exact) });

    // act
    await user.tab();
    while (document.activeElement !== marker) await user.tab();

    // assert
    expect(marker).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(exact);
  });

  it('stacks each text the client reads as its own card under its own title, the first one open', async () => {
    // arrange
    const user = userEvent.setup();
    renderPage('c1', '&pseed=two-versions');

    // act
    await user.click(screen.getByRole('button', { name: 'Texts' }));

    // assert
    const [texts] = screen.getAllByRole('region', { name: 'Texts' });
    const titles = within(texts).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
    expect(titles[0]).toMatch(/^Foundation block — building your base/);
    expect(titles).toEqual(expect.arrayContaining([expect.stringMatching(/^Your split: /), 'Low-energy session']));
    const [first, second] = within(texts).getAllByRole('article');
    expect(within(first).getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(within(first).getByText('How it should feel:')).toBeInTheDocument();
    expect(within(second).getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('shows the seven days of this week without editing menus', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const week = screen.getByRole('region', { name: 'This week' });
    const days = within(week).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(within(days[0]).getByRole('heading', { name: /Monday/ })).toBeInTheDocument();
    expect(within(week).getAllByText('Rest').length).toBeGreaterThan(0);
    expect(within(week).queryByRole('button', { name: /options$/ })).not.toBeInTheDocument();
  });

  it('lists every set of each exercise in the current block', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const sessions = screen.getByRole('region', { name: 'Foundation block sessions' });
    const [firstSession] = within(sessions).getAllByRole('article');
    const [mainLift] = within(firstSession).getAllByRole('article', { name: /^A / });
    const sets = within(within(mainLift).getByRole('list', { name: 'Sets' })).getAllByRole('listitem');
    expect(sets.map(set => set.textContent)).toEqual([
      'Set 1 · Warm-up · 8 reps',
      'Set 2 · Warm-up · 5 reps',
      'Set 3 · 12–15 · RIR 3 · 40 kg',
      'Set 4 · 12–15 · RIR 3 · 40 kg',
      'Set 5 · 12–15 · RIR 3 · 40 kg',
    ]);
    expect(within(sessions).getByRole('heading', { name: 'Intervals' })).toBeInTheDocument();
  });

  it('lists every version with its state, what changed and its document', () => {
    // arrange
    const query = '&pseed=two-versions';

    // act
    renderPage('c1', query);

    // assert
    const versions = within(screen.getByRole('region', { name: 'Versions' })).getAllByRole('listitem');
    expect(versions).toHaveLength(3);
    expect(within(versions[0]).getByText('Version 3')).toBeInTheDocument();
    expect(within(versions[0]).getByText('Draft')).toBeInTheDocument();
    expect(within(versions[1]).getByText('Published')).toBeInTheDocument();
    expect(within(versions[1]).getByText(/^Added a second lower day/)).toBeInTheDocument();
    expect(within(versions[2]).getByText('Superseded')).toBeInTheDocument();
    expect(within(versions[0]).getByRole('link', { name: 'Open document' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/document/3',
    );
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
    expect(screen.queryByRole('heading', { name: 'What changed in v2' })).not.toBeInTheDocument();
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
