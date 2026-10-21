import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { currentVersion } from '../../domain/program';
import type { CycleMode } from '../../domain/cycleMode';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { programForSeed } from '../../services/programSamples';
import { ProgramDocument } from './ProgramDocument';
import { TrackingTable } from './TrackingTable';
import { currentBlock, viewOf, type ProgramView } from './programView';

const DAY_ONE = new Date(2026, 8, 16);
const TODAY = new Date(2026, 8, 22);

function viewFor(cycleMode: CycleMode, seed: 'published' | 'two-versions' = 'published'): ProgramView {
  const program = programForSeed(seed, { callId: 'ac-demo-client-1', dayOne: DAY_ONE, cycleMode, equipment: [] }, SAMPLE_EXERCISES);
  if (!program) throw new Error('seed missing');
  const version = currentVersion(program);
  if (!version) throw new Error('version missing');
  return viewOf({
    program,
    version,
    dayOne: DAY_ONE,
    today: TODAY,
    preferredWeekday: 'mon',
    exercises: SAMPLE_EXERCISES,
    cycleDay: 12,
    clientName: 'Ana Pop',
  });
}

function blockOf(view: ProgramView) {
  const block = currentBlock(view);
  if (!block) throw new Error('block missing');
  return block;
}

const STEADY_SET = { reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };

describe('TrackingTable', () => {
  it('has a column per week and a row per set', () => {
    // arrange
    const view = viewFor('adapted');
    const block = { ...blockOf(view), weeks: 6, calibrationWeek: true };
    const session = structuredClone(block.sessions[0]);
    session.rows = [{ ...session.rows[0], sets: [STEADY_SET, STEADY_SET, STEADY_SET, STEADY_SET] }];

    // act
    render(<TrackingTable session={session} block={block} exercisesById={view.exercisesById} />);

    // assert
    const table = screen.getByRole('table', { name: `${session.name} · tracking` });
    expect(within(table).getByRole('columnheader', { name: 'Week 1 (calibration)' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Week 6' })).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader', { name: 'kg × reps' })).toHaveLength(6);
    expect(within(table).getAllByRole('row')).toHaveLength(2 + 4);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(1);
    expect(within(table).getByRole('rowheader')).toHaveTextContent('4 × 8–10 · RIR 1–2');
    expect(within(table).getByRole('cell', { name: '1 · 8–10' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '4 · 8–10' })).toBeInTheDocument();
  });

  it('prescribes each set on its own line when the sets differ', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);
    const session = structuredClone(block.sessions[0]);
    const topSet = { reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 } };
    session.rows = [{ ...session.rows[0], sets: [topSet, STEADY_SET] }];

    // act
    render(<TrackingTable session={session} block={block} exercisesById={view.exercisesById} />);

    // assert
    expect(screen.getByRole('cell', { name: '1 · 5 · RIR 2' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2 · 8–10 · RIR 1–2' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader')).not.toHaveTextContent('2 sets');
  });

  it('skips rows without an exercise', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);
    const session = structuredClone(block.sessions[0]);
    session.rows = [{ ...session.rows[0], exerciseId: '' }];

    // act
    render(<TrackingTable session={session} block={block} exercisesById={view.exercisesById} />);

    // assert
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument();
  });
});

describe('ProgramDocument', () => {
  it('lists the client, version, sessions with tracking tables and the cycle section for an adapted program', () => {
    // arrange
    const view = viewFor('adapted');
    const sessionCount = blockOf(view).sessions.length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Pop' })).toBeInTheDocument();
    expect(screen.getByText(/^Version 1 · /)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Listening to your cycle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Low-energy session' })).toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: / · tracking$/ })).toHaveLength(sessionCount);
    expect(screen.getByText('Disclaimer (page 8) — placeholder')).toBeInTheDocument();
  });

  it('omits the cycle section for a general program but keeps the low-energy session', () => {
    // arrange
    const view = viewFor('general');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.queryByRole('heading', { name: 'Listening to your cycle' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Low-energy session' })).toBeInTheDocument();
  });

  it('shows what changed from version 2', () => {
    // arrange
    const view = viewFor('adapted', 'two-versions');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'What changed in v2' })).toBeInTheDocument();
  });
});
