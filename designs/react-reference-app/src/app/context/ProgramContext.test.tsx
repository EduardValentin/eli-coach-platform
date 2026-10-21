import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from './AppContext';
import { AssessmentCallProvider } from './AssessmentCallContext';
import { AWAITING_REVIEW_CALL_ID, ClientJourneyProvider, DEMO_JOURNEY_CALL_ID, useClientJourneys } from './ClientJourneyContext';
import { ClientProfileProvider } from './ClientProfileContext';
import { dayOneOf, ProgramProvider, usePrograms, type ProgramContextType } from './ProgramContext';
import { TrainingProvider } from './TrainingContext';
import { currentVersion, draftOf, type ProgramContent } from '../domain/program';
import type { ProgramSetup } from '../domain/programOnboarding';
import { emptyRow } from '../domain/programSuggestions';

const SETUP: ProgramSetup = {
  goal: 'Lose fat',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  cycleMode: 'adapted',
  language: 'en',
  dailySteps: 6000,
  equipment: ['Dumbbells', 'Bench'],
};

type Hooks = { programs: ProgramContextType; journeys: ReturnType<typeof useClientJourneys> };
let hooks: Hooks;

function Probe() {
  hooks = { programs: usePrograms(), journeys: useClientJourneys() };
  return null;
}

function renderPrograms(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  render(
    <MemoryRouter>
      <AppProvider>
        <ClientProfileProvider>
          <TrainingProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <ProgramProvider>
                  <Probe />
                </ProgramProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </TrainingProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function withExercises(content: ProgramContent): ProgramContent {
  return {
    ...content,
    plan: {
      blocks: content.plan.blocks.map(block => ({
        ...block,
        sessions: block.sessions.map(session => ({
          ...session,
          rows: [{ ...emptyRow(block.type, 'A'), exerciseId: 'e1' }],
        })),
      })),
    },
  };
}

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
  window.history.replaceState(null, '', '/');
});

describe('creating a program', () => {
  it('creates a version 1 draft from the setup', () => {
    // arrange
    renderPrograms();

    // act
    act(() => {
      hooks.programs.createProgram(DEMO_JOURNEY_CALL_ID, SETUP);
    });

    // assert
    const program = hooks.programs.programFor(DEMO_JOURNEY_CALL_ID);
    expect(program).toMatchObject({
      goal: 'Lose fat',
      equipment: ['Dumbbells', 'Bench'],
      level: 'beginner',
      language: 'en',
      cycleMode: 'adapted',
    });
    expect(program?.versions).toHaveLength(1);
    expect(program?.versions[0]).toMatchObject({ number: 1, state: 'draft', publishedAt: null, whatChanged: '' });
    expect(program?.versions[0].content.plan.blocks.length).toBeGreaterThan(0);
  });
});

describe('publishing', () => {
  it('publishes version 1 and marks the journey program-ready', () => {
    // arrange
    renderPrograms();
    const now = new Date();
    act(() => {
      hooks.programs.createProgram(DEMO_JOURNEY_CALL_ID, SETUP);
    });
    act(() => {
      hooks.programs.updateDraft(DEMO_JOURNEY_CALL_ID, withExercises);
    });

    // act
    let outcome: ReturnType<ProgramContextType['publishDraft']> | undefined;
    act(() => {
      outcome = hooks.programs.publishDraft(DEMO_JOURNEY_CALL_ID, now);
    });

    // assert
    expect(outcome?.status).toBe('published');
    expect(currentVersion(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!)).toMatchObject({
      number: 1,
      publishedAt: now,
    });
    expect(hooks.journeys.demoJourney.stage).toBe('program-ready');
    expect(hooks.journeys.demoJourney.programReadyAt).toEqual(now);
  });

  it('refuses to publish while blocked', () => {
    // arrange
    renderPrograms();
    act(() => {
      hooks.programs.createProgram(DEMO_JOURNEY_CALL_ID, SETUP);
    });

    // act
    let outcome: ReturnType<ProgramContextType['publishDraft']> | undefined;
    act(() => {
      outcome = hooks.programs.publishDraft(DEMO_JOURNEY_CALL_ID, new Date());
    });

    // assert
    expect(outcome?.status).toBe('blocked');
    expect(outcome?.status === 'blocked' && outcome.problems.map(problem => problem.code)).toContain('missing-sessions');
    expect(draftOf(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!)).toBeDefined();
    expect(hooks.journeys.demoJourney.stage).toBe('approved');
  });

  it('supersedes the previous version when a later version is published', () => {
    // arrange
    renderPrograms('?pseed=published');
    act(() => {
      hooks.programs.startDraft(DEMO_JOURNEY_CALL_ID);
    });
    act(() => {
      hooks.programs.setWhatChanged(DEMO_JOURNEY_CALL_ID, 'Raised the steps');
    });

    // act
    act(() => {
      hooks.programs.publishDraft(DEMO_JOURNEY_CALL_ID, new Date());
    });

    // assert
    const states = hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)?.versions.map(version => version.state);
    expect(states).toEqual(['superseded', 'published']);
  });
});

describe('drafts', () => {
  it('starts a draft from the current version with fresh ids and the same originIds', () => {
    // arrange
    renderPrograms('?pseed=published');
    const published = currentVersion(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!)!;

    // act
    act(() => {
      hooks.programs.startDraft(DEMO_JOURNEY_CALL_ID);
    });

    // assert
    const draft = draftOf(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!)!;
    const [block] = published.content.plan.blocks;
    const [copy] = draft.content.plan.blocks;
    expect(draft).toMatchObject({ number: 2, state: 'draft', whatChanged: '' });
    expect(copy.id).not.toBe(block.id);
    expect(copy.originId).toBe(block.originId);
    expect(copy.sessions[0].id).not.toBe(block.sessions[0].id);
    expect(copy.sessions[0].originId).toBe(block.sessions[0].originId);
    expect(copy.sessions[0].rows[0].id).not.toBe(block.sessions[0].rows[0].id);
  });

  it('does nothing when a draft already exists', () => {
    // arrange
    renderPrograms('?pseed=two-versions');

    // act
    act(() => {
      hooks.programs.startDraft(DEMO_JOURNEY_CALL_ID);
    });

    // assert
    expect(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)?.versions).toHaveLength(3);
  });

  it('discards the draft and keeps the published version', () => {
    // arrange
    renderPrograms('?pseed=two-versions');

    // act
    act(() => {
      hooks.programs.discardDraft(DEMO_JOURNEY_CALL_ID);
    });

    // assert
    const program = hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!;
    expect(draftOf(program)).toBeUndefined();
    expect(currentVersion(program)?.number).toBe(2);
  });

  it('discards the whole program when the draft is version 1', () => {
    // arrange
    renderPrograms('?pseed=draft');

    // act
    act(() => {
      hooks.programs.discardDraft(DEMO_JOURNEY_CALL_ID);
    });

    // assert
    expect(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)).toBeUndefined();
  });

  it('edits the draft content, the what-changed text and the setup', () => {
    // arrange
    renderPrograms('?pseed=draft');

    // act
    act(() => {
      hooks.programs.updateDraft(DEMO_JOURNEY_CALL_ID, content => ({
        ...content,
        header: { ...content.header, title: 'Spring plan' },
      }));
      hooks.programs.setWhatChanged(DEMO_JOURNEY_CALL_ID, 'Because');
      hooks.programs.updateSetup(DEMO_JOURNEY_CALL_ID, { level: 'intermediate' });
    });

    // assert
    const program = hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!;
    expect(draftOf(program)).toMatchObject({ whatChanged: 'Because', content: { header: { title: 'Spring plan' } } });
    expect(program.level).toBe('intermediate');
  });
});

describe('seeds', () => {
  it('has no program without a seed', () => {
    // arrange
    // act
    renderPrograms();

    // assert
    expect(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)).toBeUndefined();
  });

  it('seeds two versions and a draft with ?pseed=two-versions', () => {
    // arrange
    // act
    renderPrograms('?pseed=two-versions');

    // assert
    const program = hooks.programs.programFor(DEMO_JOURNEY_CALL_ID);
    expect(program?.versions.map(version => [version.number, version.state])).toEqual([
      [1, 'superseded'],
      [2, 'published'],
      [3, 'draft'],
    ]);
    expect(currentVersion(hooks.programs.programFor(AWAITING_REVIEW_CALL_ID)!)?.number).toBe(1);
    expect(hooks.journeys.demoJourney.stage).toBe('program-ready');
  });

  it('dates the published version at the day the journey became program-ready', () => {
    // arrange
    // act
    renderPrograms('?pseed=published');

    // assert
    const published = currentVersion(hooks.programs.programFor(DEMO_JOURNEY_CALL_ID)!);
    expect(published?.publishedAt).toEqual(dayOneOf(hooks.journeys.demoJourney));
  });
});

describe('exercise consumers', () => {
  it('lists one consumer per version with its rows, substitutions and warm-up mobility', () => {
    // arrange
    renderPrograms('?pseed=two-versions');
    act(() => {
      hooks.programs.updateDraft(DEMO_JOURNEY_CALL_ID, content => ({
        ...content,
        plan: {
          blocks: content.plan.blocks.map((block, index) =>
            index > 0
              ? block
              : {
                  ...block,
                  sessions: block.sessions.map(session => ({
                    ...session,
                    warmUp: { ...session.warmUp, mobilityExerciseIds: ['e17'] },
                  })),
                },
          ),
        },
      }));
    });

    // act
    const consumers = hooks.programs.exerciseConsumers();

    // assert
    expect(consumers).toHaveLength(4);
    expect(consumers.some(consumer => consumer.exerciseIds.includes('e17'))).toBe(true);
    expect(consumers.every(consumer => !consumer.exerciseIds.includes(''))).toBe(true);
  });
});

describe('dayOneOf', () => {
  it('is the moment the journey became program-ready', () => {
    // arrange
    renderPrograms('?pseed=published');

    // act
    const dayOne = dayOneOf(hooks.journeys.demoJourney);

    // assert
    expect(dayOne).toBe(hooks.journeys.demoJourney.programReadyAt);
    expect(dayOneOf(null)).toBeNull();
  });
});
