import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProgramBlock } from './ProgramBlock';
import { AppProvider } from '../../../context/AppContext';
import { AssessmentCallProvider } from '../../../context/AssessmentCallContext';
import { ClientJourneyProvider, useClientJourneys } from '../../../context/ClientJourneyContext';
import { ProgramProvider, usePrograms, type ProgramContextType } from '../../../context/ProgramContext';
import type { ProgramContent } from '../../../domain/program';
import { TrainingProvider } from '../../../context/TrainingContext';

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

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

let programs: ProgramContextType;
let demoCallId: string;

function DemoProgramBlock() {
  const { demoJourney } = useClientJourneys();
  programs = usePrograms();
  demoCallId = demoJourney.callId;
  return <ProgramBlock journey={demoJourney} />;
}

function editDraft(update: (content: ProgramContent) => ProgramContent) {
  act(() => programs.updateDraft(demoCallId, update));
}

function withoutExercisesInFirstSession(content: ProgramContent): ProgramContent {
  const [first, ...rest] = content.plan.blocks;
  const [session, ...sessions] = first.sessions;
  return {
    ...content,
    plan: { blocks: [{ ...first, sessions: [{ ...session, rows: [] }, ...sessions] }, ...rest] },
  };
}

function renderBlock(query: string) {
  const url = `/coach/clients/c1?session=coach${query}`;
  window.history.replaceState(null, '', url);
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Routes>
                    <Route path="*" element={<><DemoProgramBlock /><Location /></>} />
                  </Routes>
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function programSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Program' });
}

describe('ProgramBlock', () => {
  it('offers to build a program once her answers are approved', () => {
    // arrange
    const query = '&pseed=none&jstage=approved';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText('No program yet')).toBeInTheDocument();
    expect(within(section).getByText('Build it from her profile.')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Build program' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/new',
    );
  });

  it.each(['invited', 'submitted', 'needs-details'])('holds the program back until her answers are approved (%s)', (stage) => {
    // arrange
    const query = `&pseed=none&jstage=${stage}`;

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText('No program yet')).toBeInTheDocument();
    expect(within(section).getByText('The program opens once her answers are approved.')).toBeInTheDocument();
    expect(within(section).queryByRole('link', { name: 'Build program' })).not.toBeInTheDocument();
  });

  it('lists the draft blocks and what is still missing', () => {
    // arrange
    const query = '&pseed=draft&jstage=approved';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    expect(within(section).getByText('Version 1 · draft')).toBeInTheDocument();
    const blocks = within(within(section).getByRole('list', { name: 'Blocks' })).getAllByRole('listitem');
    expect(blocks.map(block => block.textContent)).toEqual([
      'Foundation · 4 wk3 of 3 sessions',
      'Hypertrophy · 6 wk3 of 3 sessions',
      'Deload · 1 wk3 of 3 sessions',
    ]);
    const missing = within(section).getByRole('list', { name: 'Still missing' });
    expect(within(missing).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Focus not set']);
    expect(within(section).getByRole('link', { name: 'Continue draft' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program/draft',
    );
  });

  it('counts the sessions that still have no exercises', () => {
    // arrange
    renderBlock('&pseed=draft&jstage=approved');

    // act
    editDraft(withoutExercisesInFirstSession);

    // assert
    const section = programSection();
    expect(within(section).getByText('2 of 3 sessions')).toBeInTheDocument();
    const missing = within(section).getByRole('list', { name: 'Still missing' });
    expect(within(missing).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Focus not set',
      '1 session without exercises',
    ]);
  });

  it('says the draft is ready once nothing is missing', () => {
    // arrange
    renderBlock('&pseed=draft&jstage=approved');

    // act
    editDraft(content => ({ ...content, header: { ...content.header, focus: 'Technique on the main lifts' } }));

    // assert
    const section = programSection();
    expect(within(section).queryByRole('list', { name: 'Still missing' })).not.toBeInTheDocument();
    expect(within(section).getByText('Ready to publish')).toBeInTheDocument();
  });

  it('summarises the published version and where she is in the plan', () => {
    // arrange
    const query = '&pseed=published&jstage=program-ready';

    // act
    renderBlock(query);

    // assert
    const section = programSection();
    const terms = within(section).getAllByRole('term').map(term => term.textContent);
    const definitions = within(section).getAllByRole('definition').map(definition => definition.textContent ?? '');
    expect(terms).toEqual(['Now', 'Next check-in form', 'Published']);
    expect(definitions[0]).toBe('Foundation · week 1 of 11');
    expect(definitions[1]).toMatch(/^\d+ \w+$/);
    expect(definitions[2]).toMatch(/^Version 1 · \d+ \w+$/);
    const timeline = within(section).getByRole('group', { name: 'Plan timeline' });
    const plan = within(within(timeline).getByRole('list', { name: 'Plan blocks' })).getAllByRole('listitem');
    expect(plan).toHaveLength(3);
    expect(plan[0]).toHaveAttribute('aria-current', 'step');
    expect(within(timeline).getByText('Today · week 1')).toBeInTheDocument();
    expect(within(section).queryByRole('table')).not.toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'View program' })).toHaveAttribute(
      'href',
      '/coach/clients/c1/program',
    );
  });

  it('starts a new version and then offers to continue the draft', async () => {
    // arrange
    const user = renderBlock('&pseed=published&jstage=program-ready');

    // act
    await user.click(within(programSection()).getByRole('button', { name: 'New version' }));

    // assert
    expect(screen.getByTestId('location')).toHaveTextContent('/coach/clients/c1/program/draft');
    const section = programSection();
    expect(within(section).getByRole('link', { name: 'Continue draft' })).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
  });
});
