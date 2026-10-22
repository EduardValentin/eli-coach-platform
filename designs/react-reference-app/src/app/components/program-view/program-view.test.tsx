import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../context/TrainingContext';
import { currentVersion, type Session } from '../../domain/program';
import { cardioPreset } from '../../domain/programCardio';
import { programForSeed } from '../../services/programSamples';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { DayContent } from './DayContent';
import { FocusCard } from './FocusCard';
import { SessionTable } from './SessionTable';
import { WeekStrip } from './WeekStrip';
import { WhatChangedBanner } from './WhatChangedBanner';
import { currentBlock, viewOf, weekStart, type ProgramView } from './programView';

const DAY_ONE = new Date(2026, 8, 16);
const TODAY = new Date(2026, 8, 22);

afterEach(() => {
  window.localStorage.clear();
});

function viewAt(today: Date, cycleDay: number | null = 12, exercises: readonly Exercise[] = SAMPLE_EXERCISES): ProgramView {
  const program = programForSeed('published', { callId: 'ac-demo-client-1', dayOne: DAY_ONE, cycleMode: 'adapted', equipment: [] }, SAMPLE_EXERCISES);
  if (!program) throw new Error('seed missing');
  const version = currentVersion(program);
  if (!version) throw new Error('version missing');
  return viewOf({ program, version, dayOne: DAY_ONE, today, preferredWeekday: 'mon', exercises, cycleDay });
}

function blockOf(view: ProgramView) {
  const block = currentBlock(view);
  if (!block) throw new Error('block missing');
  return block;
}

function sessionWith(view: ProgramView, edit: (session: Session) => Session): Session {
  return edit(blockOf(view).sessions[0]);
}

describe('FocusCard', () => {
  it('shows the block, week, next check-in and cycle estimate', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<FocusCard view={view} action={<button type="button">Download PDF</button>} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Foundation' })).toBeInTheDocument();
    expect(screen.getByText('Week 1 of 11')).toBeInTheDocument();
    expect(screen.getAllByRole('term')).toHaveLength(2);
    expect(screen.getByText('Next check-in form')).toBeInTheDocument();
    expect(screen.getByText('Monday, 5 October')).toBeInTheDocument();
    expect(screen.getByText('Cycle day')).toBeInTheDocument();
    expect(screen.getByText('~12 (estimate)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('omits the cycle line without an estimate', () => {
    // arrange
    const view = viewAt(TODAY, null);

    // act
    render(<FocusCard view={view} />);

    // assert
    expect(screen.queryByText(/Cycle day/)).not.toBeInTheDocument();
  });

  it('tells the client the plan has ended', () => {
    // arrange
    const view = viewAt(new Date(2026, 11, 10));

    // act
    render(<FocusCard view={view} />);

    // assert
    expect(screen.getByText('Your plan has ended, your coach is preparing the next version')).toBeInTheDocument();
  });

  it('tells the client the program has not started', () => {
    // arrange
    const view = { ...viewAt(TODAY), dayOne: null, position: { status: 'before' as const } };

    // act
    render(<FocusCard view={view} />);

    // assert
    expect(screen.getByText('Your program starts when version 1 is published')).toBeInTheDocument();
  });
});

describe('WhatChangedBanner', () => {
  const version = { ...viewAt(TODAY).version, number: 2, whatChanged: 'Raised steps to 8,000.' };

  it('is hidden for the first version', () => {
    // arrange
    const first = { ...version, number: 1 };

    // act
    render(<WhatChangedBanner version={first} dismissedVersion={null} onDismiss={vi.fn()} />);

    // assert
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden once that version was dismissed', () => {
    // arrange / act
    render(<WhatChangedBanner version={version} dismissedVersion={2} onDismiss={vi.fn()} />);

    // assert
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('remembers the dismissal', async () => {
    // arrange
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<WhatChangedBanner version={version} dismissedVersion={null} onDismiss={onDismiss} />);
    const banner = screen.getByRole('complementary', { name: 'What changed in v2' });
    expect(within(banner).getByText('Raised steps to 8,000.')).toBeInTheDocument();

    // act
    await user.click(within(banner).getByRole('button', { name: 'Dismiss' }));

    // assert
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem('program-what-changed-dismissed')).toBe('2');
  });
});

describe('WeekStrip', () => {
  it('lists the week with its entries and marks today and the selection', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(TODAY);
    const onSelect = vi.fn();
    render(<WeekStrip block={blockOf(view)} weekStart={weekStart(view)} today={TODAY} selected="mon" onSelect={onSelect} />);

    // act
    const tabs = within(screen.getByRole('tablist', { name: 'This week' })).getAllByRole('tab');
    await user.click(screen.getByRole('tab', { name: /Sat/ }));

    // assert
    expect(tabs).toHaveLength(7);
    expect(screen.getByRole('tab', { name: /Mon 21/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Tue 22/ })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('tab', { name: /Sat 26/ })).toHaveTextContent('Rest');
    expect(onSelect).toHaveBeenCalledWith('sat');
  });

  it('moves between days with the arrow, Home and End keys', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(TODAY);
    const onSelect = vi.fn();
    render(<WeekStrip block={blockOf(view)} weekStart={weekStart(view)} today={TODAY} selected="mon" onSelect={onSelect} />);
    screen.getByRole('tab', { name: /Mon 21/ }).focus();

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    expect(onSelect).toHaveBeenLastCalledWith('tue');
    expect(screen.getByRole('tab', { name: /Tue 22/ })).toHaveFocus();

    // act
    await user.keyboard('{End}');

    // assert
    expect(onSelect).toHaveBeenLastCalledWith('sun');
    expect(screen.getByRole('tab', { name: /Sun 27/ })).toHaveFocus();
  });

  it('labels cardio days with their session name', () => {
    // arrange
    const view = viewAt(TODAY);
    const block = blockOf(view);
    const liss = { ...cardioPreset('liss', SAMPLE_EXERCISES), id: 'c1' };
    const hiit = { ...cardioPreset('hiit', SAMPLE_EXERCISES), id: 'c2' };
    const withCardio = {
      ...block,
      cardioSessions: [liss, hiit],
      calendar: { ...block.calendar, sat: { kind: 'cardio' as const, cardioId: 'c1' }, sun: { kind: 'cardio' as const, cardioId: 'c2' } },
    };

    // act
    render(<WeekStrip block={withCardio} weekStart={weekStart(view)} today={TODAY} selected="mon" onSelect={vi.fn()} />);

    // assert
    expect(screen.getByRole('tab', { name: /Sat 26/ })).toHaveTextContent('Easy cardio');
    expect(screen.getByRole('tab', { name: /Sun 27/ })).toHaveTextContent('Intervals');
  });
});

describe('DayContent', () => {
  const squat = SAMPLE_EXERCISES.find(exercise => exercise.id === 'e1') as Exercise;
  const deadlift = SAMPLE_EXERCISES.find(exercise => exercise.id === 'e2') as Exercise;

  function withSession(view: ProgramView, edit: (session: Session) => Session) {
    const block = blockOf(view);
    const session = edit(block.sessions[0]);
    return {
      ...block,
      sessions: [session, ...block.sessions.slice(1)],
      calendar: { ...block.calendar, mon: { kind: 'session' as const, sessionId: session.id } },
    };
  }

  function withCardio(view: ProgramView, kind: 'hiit' | 'finisher') {
    const block = blockOf(view);
    const cardio = { ...cardioPreset(kind, SAMPLE_EXERCISES), id: 'c1' };
    return { ...block, cardioSessions: [cardio], calendar: { ...block.calendar, sat: { kind: 'cardio' as const, cardioId: 'c1' } } };
  }

  const warmUp = { kind: 'warm-up' as const, reps: { min: 8, max: 8 }, weightKg: 20 };
  const heavy = { kind: 'working' as const, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, weightKg: 40 };
  const byFeel = { kind: 'working' as const, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } };

  function strengthDay(view: ProgramView) {
    return withSession(view, session => ({
      ...session,
      name: 'Lower A',
      coolDown: true,
      warmUp: { warmUpSetsNote: 'Two light ramp-up sets', mobilityExerciseIds: [deadlift.id] },
      rows: [
        { ...session.rows[0], slot: 'A', supersetGroup: undefined, exerciseId: squat.id, sets: [warmUp, heavy, byFeel], restSeconds: 120, cues: 'Brace before you descend', substitutions: [deadlift.id] },
        { ...session.rows[1], slot: 'C', supersetGroup: 'g', exerciseId: deadlift.id, sets: [byFeel] },
        { ...session.rows[1], id: 'paired', slot: 'C', supersetGroup: 'g', exerciseId: squat.id, sets: [byFeel] },
      ],
    }));
  }

  it('lists every set of an exercise with its reps, RIR and suggested weight', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={strengthDay(view)} weekday="mon" />);

    // assert
    const card = screen.getByRole('article', { name: `A ${squat.name}` });
    const sets = within(within(card).getByRole('list', { name: 'Sets' })).getAllByRole('listitem');
    expect(sets.map(set => set.textContent)).toEqual([
      'Set 1 · Warm-up · 8 reps · 20 kg',
      'Set 2 · 6–10 reps · RIR 1–2 · 40 kg',
      'Set 3 · 6–10 reps · RIR 1–2 · by RIR',
    ]);
    expect(within(card).getAllByText('Rest 2 min')).toHaveLength(1);
    expect(within(card).getByText(squat.primaryMuscles[0])).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('heads the day with the session, its length, the warm-up and the cool-down', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={strengthDay(view)} weekday="mon" />);

    // assert
    expect(screen.getByRole('heading', { level: 3, name: 'Lower A' })).toBeInTheDocument();
    expect(screen.getByText(/^~\d+ min$/)).toBeInTheDocument();
    expect(screen.getByText('Two light ramp-up sets')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Mobility' })).getByText(deadlift.name)).toBeInTheDocument();
    expect(screen.getByText('Cool-down')).toBeInTheDocument();
    expect(screen.getByText(/Low-energy session/)).toBeInTheDocument();
  });

  it('groups a superset under one label', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={strengthDay(view)} weekday="mon" />);

    // assert
    const superset = screen.getByRole('list', { name: 'Superset' });
    expect(within(superset).getAllByRole('article')).toHaveLength(2);
    expect(within(superset).getByRole('article', { name: `C1 ${deadlift.name}` })).toBeInTheDocument();
    expect(within(superset).getByRole('article', { name: `C2 ${squat.name}` })).toBeInTheDocument();
  });

  it('keeps cues, video and swaps collapsed until asked for', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(TODAY);
    render(<DayContent view={view} block={strengthDay(view)} weekday="mon" />);
    const card = screen.getByRole('article', { name: `A ${squat.name}` });
    expect(within(card).queryByText('Brace before you descend')).not.toBeInTheDocument();

    // act
    await user.click(within(card).getByRole('button', { name: 'Cues, video and swaps' }));

    // assert
    expect(within(card).getByText('Brace before you descend')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Watch video' })).toBeInTheDocument();
    expect(within(card).getByText(`Swap for: ${deadlift.name}`)).toBeInTheDocument();
    expect(within(card).getByText(/How to progress:/)).toBeInTheDocument();
  });

  it('renders a rest day', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={blockOf(view)} weekday="sat" />);

    // assert
    expect(screen.getByText('Rest day. A short walk still counts.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('renders a cardio day as its segments', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={withCardio(view, 'hiit')} weekday="sat" />);

    // assert
    expect(screen.getByRole('heading', { level: 3, name: 'Intervals' })).toBeInTheDocument();
    expect(screen.getByText('26 min')).toBeInTheDocument();
    const segments = within(screen.getByRole('list', { name: 'Segments' })).getAllByRole('listitem');
    expect(segments.map(segment => segment.textContent)).toEqual([
      'Stationary bike · 5 min · You can hold a conversation',
      'Stationary bike · 8 × 30 s hard / 90 s easy · Hard: only a few words at a time',
      'Stationary bike · 5 min · You can hold a conversation',
    ]);
    expect(screen.getByText(/Swap this for a 30-minute easy walk/)).toBeInTheDocument();
  });

  it('renders a circuit with its rounds, rest and exercises', () => {
    // arrange
    const view = viewAt(TODAY);
    const block = withCardio(view, 'finisher');
    const [circuit] = block.cardioSessions[0].segments;
    if (circuit.plan.kind !== 'circuit') throw new Error('expected a circuit');
    const names = circuit.plan.items.map(item => SAMPLE_EXERCISES.find(exercise => exercise.id === item.exerciseId)?.name);

    // act
    render(<DayContent view={view} block={block} weekday="sat" />);

    // assert
    const segment = within(screen.getByRole('list', { name: 'Segments' })).getAllByRole('listitem')[0];
    expect(segment).toHaveTextContent('Circuit · 3 rounds · 60 s rest between rounds');
    expect(within(segment).getAllByRole('listitem').map(item => item.textContent)).toEqual(names.map(name => `${name} · 30 s`));
  });
});

describe('SessionTable', () => {
  const perSide = SAMPLE_EXERCISES.find(exercise => exercise.perSide && exercise.type === 'resistance');

  function superset(view: ProgramView): Session {
    if (!perSide) throw new Error('no per-side exercise');
    return sessionWith(view, session => ({
      ...session,
      rows: session.rows.slice(0, 2).map((row, index) => ({
        ...row,
        slot: 'C',
        supersetGroup: 'g',
        exerciseId: perSide.id,
        restSeconds: index === 0 ? 120 : 90,
      })),
    }));
  }

  function renderSession(session: Session) {
    const exercises = new Map(SAMPLE_EXERCISES.map(exercise => [exercise.id, exercise]));
    return render(<SessionTable session={session} exercisesById={exercises} />);
  }

  it('labels supersets, shows the unit and formats rest', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    renderSession(superset(view));

    // assert
    expect(screen.getByRole('cell', { name: 'C1 Superset' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'C2 Superset' })).toBeInTheDocument();
    expect(screen.getAllByText(/\/side/).length).toBeGreaterThan(0);
    expect(screen.getByRole('cell', { name: '2 min' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '90 s' })).toBeInTheDocument();
  });

  it('prints a row for every set with its kind, reps, RIR and weight', () => {
    // arrange
    const view = viewAt(TODAY);
    const warmUp = { kind: 'warm-up' as const, reps: { min: 10, max: 10 } };
    const top = { kind: 'working' as const, reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 }, weightKg: 60 };
    const steady = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };
    const session = sessionWith(view, original => ({ ...original, rows: [{ ...original.rows[0], sets: [warmUp, top, steady] }] }));

    // act
    renderSession(session);

    // assert
    const [, ...rows] = screen.getAllByRole('row');
    const cellsOf = (index: number) => within(rows[index]).getAllByRole('cell').map(cell => cell.textContent);
    expect(rows).toHaveLength(3);
    expect(cellsOf(0)).toEqual(expect.arrayContaining(['Warm-up', '10', '—']));
    expect(cellsOf(1)).toEqual(['1', '5', '2', '60 kg']);
    expect(cellsOf(2)).toEqual(['2', '8–10', '1–2', '—']);
  });

  it('prints cues, swaps and a custom progression under the exercise', () => {
    // arrange
    const view = viewAt(TODAY);
    const session = sessionWith(view, original => ({
      ...original,
      rows: [{ ...original.rows[0], cues: 'Brace first', progression: { kind: 'custom' as const, text: 'Add 2 kg weekly' } }],
    }));

    // act
    renderSession(session);

    // assert
    const exercise = screen.getByRole('rowheader');
    expect(exercise).toHaveTextContent('Brace first');
    expect(exercise).toHaveTextContent('Add 2 kg weekly');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still names an archived exercise and flags a removed one', () => {
    // arrange
    const view = viewAt(TODAY);
    const session = sessionWith(view, current => current);
    const [first, second] = session.rows;
    const archived = { ...(SAMPLE_EXERCISES.find(exercise => exercise.id === first.exerciseId) as Exercise), archivedAt: '2026-09-01T00:00:00.000Z' };
    const exercises = new Map<string, Exercise>([[archived.id, archived]]);
    const rows = [first, { ...second, exerciseId: 'gone' }];

    // act
    render(<SessionTable session={{ ...session, rows }} exercisesById={exercises} />);

    // assert
    expect(screen.getByRole('rowheader', { name: new RegExp(`^${archived.name}`) })).toBeInTheDocument();
    expect(screen.getByText('Exercise removed')).toBeInTheDocument();
  });
});
