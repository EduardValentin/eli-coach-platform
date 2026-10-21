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
    expect(screen.getByText('Current focus')).toBeInTheDocument();
    expect(screen.getByText(/Foundation · week 1 of 11/)).toBeInTheDocument();
    expect(screen.getByText('Next check-in form Monday, 5 October')).toBeInTheDocument();
    expect(screen.getByText('Cycle day ~12 (estimate)')).toBeInTheDocument();
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
  it('renders the session for a training day', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={blockOf(view)} weekday="mon" />);

    // assert
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/Low-energy session/)).toBeInTheDocument();
  });

  it('renders a rest day', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    render(<DayContent view={view} block={blockOf(view)} weekday="sat" />);

    // assert
    expect(screen.getByText('Rest day. A short walk still counts.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a cardio day with its segments', () => {
    // arrange
    const view = viewAt(TODAY);
    const block = blockOf(view);
    const cardio = { ...cardioPreset('hiit', SAMPLE_EXERCISES), id: 'c1' };
    const withCardio = {
      ...block,
      cardioSessions: [cardio],
      calendar: { ...block.calendar, sat: { kind: 'cardio' as const, cardioId: 'c1' } },
    };

    // act
    render(<DayContent view={view} block={withCardio} weekday="sat" />);

    // assert
    expect(screen.getByRole('heading', { name: 'Intervals · 26 min' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Stationary bike · 5 min · You can hold a conversation',
      'Stationary bike · 8 × 30 s on, 90 s easy · Hard: only a few words at a time',
      'Stationary bike · 5 min · You can hold a conversation',
    ]);
    expect(screen.getByText(/Swap this for a 30-minute easy walk/)).toBeInTheDocument();
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

  function renderSession(session: Session, view: ProgramView, mode: 'client' | 'document' = 'client') {
    const exercises = new Map(SAMPLE_EXERCISES.map(exercise => [exercise.id, exercise]));
    return render(
      <SessionTable session={session} block={blockOf(view)} language="en" exercisesById={exercises} mode={mode} />,
    );
  }

  it('labels supersets, shows the unit and formats rest', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    renderSession(superset(view), view);

    // assert
    const exercises = screen.getAllByRole('rowheader');
    expect(exercises[0]).toHaveTextContent(/^C1 /);
    expect(exercises[1]).toHaveTextContent(/^C2 /);
    expect(screen.getAllByText(/\/side/).length).toBeGreaterThan(0);
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('90 s')).toBeInTheDocument();
  });

  it('summarises identical sets and lists differing sets one per line', () => {
    // arrange
    const view = viewAt(TODAY);
    const steady = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };
    const top = { kind: 'working' as const, reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 } };
    const session = sessionWith(view, original => ({
      ...original,
      rows: [
        { ...original.rows[0], sets: [steady, steady, steady] },
        { ...original.rows[1], exerciseId: original.rows[0].exerciseId, sets: [top, steady] },
      ],
    }));

    // act
    renderSession(session, view);

    // assert
    expect(screen.getByRole('cell', { name: '3 × 8–10 · RIR 1–2' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Set 1 · 5 · RIR 2', 'Set 2 · 8–10 · RIR 1–2']);
  });

  it('keeps row details collapsed for the client and opens them on demand', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(TODAY);
    renderSession(sessionWith(view, session => session), view);
    const [trigger] = screen.getAllByRole('button', { name: 'Cues · video · substitutions · how to progress' });
    expect(screen.queryByText(/How to progress:/)).not.toBeInTheDocument();

    // act
    await user.click(trigger);

    // assert
    expect(screen.getByText(/How to progress:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Watch video' })).toBeInTheDocument();
  });

  it('expands everything in document mode without triggers', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    renderSession(sessionWith(view, session => session), view, 'document');

    // assert
    expect(screen.queryByRole('button', { name: /Cues/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/How to progress:/).length).toBeGreaterThan(0);
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
    render(
      <SessionTable session={{ ...session, rows }} block={blockOf(view)} language="en" exercisesById={exercises} mode="client" />,
    );

    // assert
    expect(screen.getByRole('rowheader', { name: `A ${archived.name}` })).toBeInTheDocument();
    expect(screen.getByText('Exercise removed')).toBeInTheDocument();
  });
});
