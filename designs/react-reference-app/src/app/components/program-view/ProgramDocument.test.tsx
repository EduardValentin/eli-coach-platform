import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BLOCK_TYPE_LABELS, currentVersion, formatRange, warmUpItemText, workingSets } from '../../domain/program';
import type { CycleMode } from '../../domain/cycleMode';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { programForSeed } from '../../services/programSamples';
import { ProgramDocument } from './ProgramDocument';
import { parseTemplate, template } from './ProgramText';
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

const STEADY_SET = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };

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
    const table = screen.getByRole('table', { name: `Track ${session.name}` });
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
    const topSet = { kind: 'working' as const, reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 } };
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
  it('opens with a cover band naming the client, version, date, coach and current block', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const cover = screen.getByRole('banner');
    expect(within(cover).getByRole('heading', { level: 1, name: 'Ana Pop' })).toBeInTheDocument();
    expect(within(cover).getByText(/^Program · Version 1 · \d{1,2} \w+ 2026$/)).toBeInTheDocument();
    expect(within(cover).getByText('Coach: Eli')).toBeInTheDocument();
    expect(within(cover).getByText(`${BLOCK_TYPE_LABELS[block.type]} block`)).toBeInTheDocument();
  });

  it('gives the current block and week, next check-in, daily steps and sessions per week at a glance', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);
    const sessionDays = Object.values(block.calendar).filter(entry => entry.kind === 'session').length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const glance = screen.getByRole('region', { name: 'At a glance' });
    expect(glance).toHaveTextContent(`Now${BLOCK_TYPE_LABELS[block.type]} · week 1 of ${block.weeks}`);
    expect(glance).toHaveTextContent(/Next check-in form\w+day, \d{1,2} \w+Daily steps/);
    expect(glance).toHaveTextContent(`Daily steps${block.dailySteps.toLocaleString('en-US')}`);
    expect(glance).toHaveTextContent(`Sessions per week${sessionDays} strength`);
  });

  it('lays the week out as a table with a cell for each of the seven days', () => {
    // arrange
    const view = viewFor('adapted');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const week = screen.getByRole('table', { name: 'This week' });
    expect(within(week).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(week).getAllByRole('cell')).toHaveLength(7);
  });

  it('prints one exercise table row per set with the exercise named once', () => {
    // arrange
    const view = viewFor('adapted');
    const [session] = blockOf(view).sessions;
    const [row] = session.rows;
    const name = view.exercisesById.get(row.exerciseId)?.name ?? '';
    const setCount = session.rows.reduce((total, candidate) => total + candidate.sets.length, 0);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const table = screen.getByRole('table', { name: `${session.name} exercises` });
    const [, ...body] = within(table).getAllByRole('row');
    expect(body).toHaveLength(setCount);
    expect(within(table).getAllByRole('rowheader', { name: new RegExp(`^${name}`) })).toHaveLength(1);
    for (const header of ['Position', 'Exercise', 'Set', 'Reps', 'RIR', 'Weight', 'Rest']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('tracks each working set of a session with its reps target', () => {
    // arrange
    const view = viewFor('adapted');
    const [session] = blockOf(view).sessions;
    const workingCount = session.rows.reduce((total, row) => total + workingSets(row.sets).length, 0);
    const [firstSet] = workingSets(session.rows[0].sets);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const grid = screen.getByRole('table', { name: `Track ${session.name}` });
    const [, , ...body] = within(grid).getAllByRole('row');
    expect(body).toHaveLength(workingCount);
    expect(within(body[0]).getByRole('cell', { name: new RegExp(`^1 · ${formatRange(firstSet.reps)}`) })).toBeInTheDocument();
  });

  it('prints no identifiers, no video links and the legend heading once', () => {
    // arrange
    const view = viewFor('adapted');

    // act
    const { container } = render(<ProgramDocument view={view} />);

    // assert
    expect(container).not.toHaveTextContent('full-body');
    expect(container).not.toHaveTextContent('**');
    expect(screen.queryByText(/watch video/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('How to read your session')).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'How to read your session' })).toBeInTheDocument();
  });

  it('lists the plan, sessions with tracking tables and the cycle section for an adapted program', () => {
    // arrange
    const view = viewFor('adapted');
    const sessionCount = blockOf(view).sessions.length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Your plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Listening to your cycle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Low-energy session' })).toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: /^Track / })).toHaveLength(sessionCount);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Disclaimer (page 8) — placeholder');
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

  it('titles the block section with the intro template line, never a generic heading as well', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);
    const { title } = parseTemplate(block.introText || template(view, `block.${block.type}`));

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: `${BLOCK_TYPE_LABELS[block.type]} block` })).not.toBeInTheDocument();
  });

  it('titles the split and steps sections with their template lines', () => {
    // arrange
    const view = viewFor('adapted');
    const block = blockOf(view);
    const split = parseTemplate(block.split.text).title;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: split })).toBeInTheDocument();
    expect(screen.getAllByText(split)).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: `Daily steps: ${block.dailySteps.toLocaleString('en-US')}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'This week' })).toBeInTheDocument();
  });

  it('lists each warm-up exercise with its sets and amount on the session card', () => {
    // arrange
    const view = viewFor('adapted');
    const [session] = blockOf(view).sessions;
    const lines = session.warmUp.items.map(item => `${view.exercisesById.get(item.exerciseId)?.name} · ${warmUpItemText(item)}`);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: session.name });
    expect(lines.length).toBeGreaterThan(0);
    expect(within(card).getByRole('heading', { level: 4, name: 'Warm-up' })).toBeInTheDocument();
    const items = within(card).getAllByRole('listitem').map(item => item.textContent);
    for (const line of lines) expect(items).toContain(line);
  });

  it('prints the cool-down note and stretches when the cool-down is on', () => {
    // arrange
    const view = viewFor('adapted');
    const [session] = blockOf(view).sessions;
    const [stretch] = SAMPLE_EXERCISES;
    session.coolDown = { enabled: true, note: 'Walk easy for five minutes.', items: [{ id: 'cd-1', exerciseId: stretch.id, seconds: 30 }] };

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: session.name });
    expect(within(card).getByRole('heading', { level: 4, name: 'Cool-down' })).toBeInTheDocument();
    expect(within(card).getByText('Walk easy for five minutes.')).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem').map(item => item.textContent)).toContain(`${stretch.name} · 30 s`);
  });

  it('prints a rounds segment as its rounds, its exercises and the non-zero easy and rest times', () => {
    // arrange
    const view = viewFor('adapted', 'two-versions');
    const cardio = blockOf(view).cardioSessions.find(candidate => candidate.segments.some(segment => segment.kind === 'rounds'));
    if (!cardio) throw new Error('rounds cardio missing');
    const rounds = cardio.segments.find(segment => segment.kind === 'rounds');
    if (rounds?.kind !== 'rounds') throw new Error('rounds segment missing');
    const [item] = rounds.items;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: cardio.name });
    expect(within(card).getByText(`${rounds.rounds} rounds`)).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem').map(entry => entry.textContent)).toContain(`${view.exercisesById.get(item.exerciseId)?.name} · ${item.workSeconds} s`);
    expect(within(card).getByText(`${rounds.easySeconds} s easy between exercises`)).toBeInTheDocument();
    expect(within(card).queryByText(/between rounds/)).not.toBeInTheDocument();
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
