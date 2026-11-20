import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays } from 'date-fns';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { currentBlockOf, seededProgramView } from '../../../test/programFixtures';
import type { Exercise } from '../../context/TrainingContext';
import type { Block, ProgramVersion, Weekday } from '../../domain/program';
import { cardioPreset } from '../../domain/programCardio';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { ProgramViewer } from './ProgramViewer';
import { ClientProgramView } from '../client-portal/ClientProgramView';
import { dailyStepsText, type ProgramView } from './programView';
import { useLocalWeekSelection } from './weekSelection';

const DAY_ONE = new Date(2026, 8, 16);
const TODAY = new Date(2026, 8, 22);
const SESSION_DAY = new Date(2026, 8, 21);

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
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
});

function viewAt(today: Date, exercises: readonly Exercise[] = SAMPLE_EXERCISES): ProgramView {
  return seededProgramView({ seed: 'published', dayOne: DAY_ONE, today, exercises });
}

function withFirstBlock(view: ProgramView, edit: (block: Block) => Block): ProgramView {
  const [first, ...rest] = view.version.content.plan.blocks;
  const version: ProgramVersion = { ...view.version, content: { ...view.version.content, plan: { blocks: [edit(first), ...rest] } } };
  return { ...view, version };
}

function restingOn(view: ProgramView, weekdays: readonly Weekday[]): ProgramView {
  return withFirstBlock(view, block => ({ ...block, calendar: { ...block.calendar, ...Object.fromEntries(weekdays.map(weekday => [weekday, { kind: 'rest' }])) } }));
}

function Viewer({ view }: { view: ProgramView }) {
  const selection = useLocalWeekSelection();
  return (
    <ProgramViewer
      view={view}
      selection={selection}
      planPlacement="after-week"
      planVoice="client"
      versions={view.program.versions}
      versionStates="shown"
      versionAction={version => <a href={`/document/${version.number}`}>{`Download PDF, version ${version.number}`}</a>}
      unwrittenDescription={block => `${block.name} is not written.`}
    />
  );
}

function renderViewer(view: ProgramView) {
  return render(
    <MemoryRouter>
      <Viewer view={view} />
    </MemoryRouter>,
  );
}

function ClientViewer({ view }: { view: ProgramView }) {
  const selection = useLocalWeekSelection();
  return <ClientProgramView view={view} selection={selection} />;
}

function renderClientView(version: ProgramVersion) {
  const view = viewAt(TODAY);
  return render(
    <MemoryRouter>
      <ClientViewer view={{ ...view, version }} />
    </MemoryRouter>,
  );
}

const WHAT_CHANGED = /^What changed:/;

describe('What changed notice', () => {
  const version = { ...viewAt(TODAY).version, number: 2, whatChanged: 'Raised steps to 8,000.' };

  it('is hidden for the first version', () => {
    // arrange
    const first = { ...version, number: 1 };

    // act
    renderClientView(first);

    // assert
    expect(screen.queryByText(WHAT_CHANGED)).not.toBeInTheDocument();
  });

  it('is left out when the coach wrote nothing about the change', () => {
    // arrange
    const unwritten = { ...version, whatChanged: '' };

    // act
    renderClientView(unwritten);

    // assert
    expect(screen.queryByText(WHAT_CHANGED)).not.toBeInTheDocument();
  });

  it('is hidden once that version was dismissed', () => {
    // arrange
    window.localStorage.setItem('program-what-changed-dismissed', '2');

    // act
    renderClientView(version);

    // assert
    expect(screen.queryByText(WHAT_CHANGED)).not.toBeInTheDocument();
  });

  it('remembers the dismissal', async () => {
    // arrange
    const user = userEvent.setup();
    renderClientView(version);
    const notice = screen.getByText(WHAT_CHANGED).closest('[role="status"]') as HTMLElement;
    expect(notice).toHaveTextContent('What changed: Raised steps to 8,000.');

    // act
    await user.click(within(notice).getByRole('button', { name: 'Dismiss' }));

    // assert
    expect(screen.queryByText(WHAT_CHANGED)).not.toBeInTheDocument();
    expect(window.localStorage.getItem('program-what-changed-dismissed')).toBe('2');
  });
});

describe('ProgramViewer week', () => {
  it('heads the week with the plan week, its block and the split, and opens today', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    renderViewer(view);

    // assert
    const week = screen.getByRole('region', { name: /^Week 1 of 11/ });
    expect(within(week).getByText('Foundation block, week 1 of 4')).toBeInTheDocument();
    expect(within(week).queryByRole('button', { name: /^Foundation block/ })).not.toBeInTheDocument();
    expect(within(week).getByRole('button', { name: 'Full Body' })).toHaveAttribute('aria-expanded', 'false');
    const rail = screen.getByRole('tablist', { name: 'Days of week 1 of 11' });
    const tabs = within(rail).getAllByRole('tab');
    expect(tabs[0]).toHaveAccessibleName(/^Wednesday 16 September, /);
    const today = tabs[tabs.length - 1];
    expect(today).toHaveAccessibleName(/^Tuesday 22 September, .+, today$/);
    expect(today).toHaveAttribute('aria-selected', 'true');
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(tabs.filter(tab => tab.hasAttribute('aria-controls'))).toEqual([today]);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('moves between days with the arrow, Home and End keys', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));
    const tabs = screen.getAllByRole('tab');
    const last = tabs[tabs.length - 1];
    last.focus();

    // act
    await user.keyboard('{Home}');
    const afterHome = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    await user.keyboard('{ArrowRight}');
    const afterArrow = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    await user.keyboard('{End}');

    // assert
    expect(afterHome).toBe(0);
    expect(afterArrow).toBe(1);
    expect(last).toHaveAttribute('aria-selected', 'true');
    expect(last).toHaveFocus();
  });

  it('keeps the rest days in the rail as disabled tabs that the arrow keys step over', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(restingOn(viewAt(TODAY), ['sat', 'sun']));
    const rail = screen.getByRole('tablist', { name: 'Days of week 1 of 11' });
    await user.click(within(rail).getByRole('tab', { name: /^Friday 18 September, / }));

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    const monday = within(rail).getByRole('tab', { name: /^Monday 21 September, / });
    expect(monday).toHaveFocus();
    expect(monday).toHaveAttribute('aria-selected', 'true');
    expect(within(rail).getAllByRole('tab')).toHaveLength(7);
    expect(within(rail).getByRole('tab', { name: 'Saturday 19 September, Rest' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(rail).getByRole('tab', { name: 'Sunday 20 September, Rest' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(rail).getByRole('tab', { name: 'Sunday 20 September, Rest' })).not.toHaveAttribute('aria-controls');
  });

  it('opens the next training day when she rests today, and keeps today marked on its rest day', () => {
    // arrange
    const view = restingOn(viewAt(new Date(2026, 8, 19)), ['sat', 'sun']);

    // act
    renderViewer(view);

    // assert
    const rail = screen.getByRole('tablist', { name: 'Days of week 1 of 11' });
    expect(within(rail).getByRole('tab', { name: 'Saturday 19 September, Rest, today' })).toHaveAttribute('aria-current', 'date');
    expect(within(rail).getByRole('tab', { selected: true })).toHaveAccessibleName(/^Monday 21 September, /);
    expect(within(screen.getByRole('tabpanel')).queryByRole('heading', { level: 3, name: 'Rest' })).not.toBeInTheDocument();
  });

  it('opens the latest earlier training day when she rests today and the week holds no more training', () => {
    // arrange
    const view = restingOn(viewAt(TODAY), ['tue']);

    // act
    renderViewer(view);

    // assert
    const rail = screen.getByRole('tablist', { name: 'Days of week 1 of 11' });
    expect(within(rail).getByRole('tab', { name: 'Tuesday 22 September, Rest, today' })).toHaveAttribute('aria-current', 'date');
    expect(within(rail).getByRole('tab', { selected: true })).toHaveAccessibleName(/^Monday 21 September, /);
  });

  it('steps through the plan weeks and offers the way back to this week', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'This week' })).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Next week' }));

    // assert
    expect(screen.getByRole('heading', { level: 2, name: /^Week 2 of 11/ })).toBeInTheDocument();
    expect(screen.getByText('Week 2 of 11, Foundation block, week 2 of 4')).toHaveAttribute('role', 'status');
    expect(screen.getAllByRole('tab').every(tab => !tab.hasAttribute('aria-current'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(screen.getByRole('heading', { level: 2, name: /^Week 1 of 11/ })).toBeInTheDocument();
  });

  it('names a one-week block without a week of block', () => {
    // arrange
    const lastWeek = addDays(TODAY, 70);

    // act
    renderViewer(viewAt(lastWeek));

    // assert
    const week = screen.getByRole('region', { name: /^Week 11 of 11/ });
    expect(within(week).getByText('Deload block')).toBeInTheDocument();
    expect(within(week).getByText('Deload')).toBeInTheDocument();
    expect(week).not.toHaveTextContent('week 1 of 1');
  });

  it('states the daily steps once for the week and names each rail day without its length', () => {
    // arrange
    const view = viewAt(SESSION_DAY);

    // act
    renderViewer(view);

    // assert
    const week = screen.getByRole('region', { name: /^Week 1 of 11/ });
    const steps = dailyStepsText(currentBlockOf(view));
    expect(within(week).getByText('Daily steps').nextElementSibling).toHaveTextContent(steps);
    expect(within(week).getAllByText(steps)).toHaveLength(1);
    const tabs = within(week).getAllByRole('tab');
    expect(tabs.some(tab => /min/.test(tab.textContent ?? ''))).toBe(false);
    expect(within(screen.getByRole('tabpanel')).getByText(/^~\d+ min$/)).toBeInTheDocument();
  });

  it('marks the check-in form day on its rail day and tells her on that day what to send', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    const checkInTab = screen.getAllByRole('tab').find(tab => tab.textContent?.endsWith(', check-in form day'));
    if (!checkInTab) throw new Error('no check-in day in week 3');

    // act
    await user.click(checkInTab);

    // assert
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Check-in form day.').parentElement).toHaveTextContent('Check-in form day. Send your form with photos of your log pages from weeks 1 and 2.');
    expect(screen.queryByText(/Check-in form due/)).not.toBeInTheDocument();
  });

  it('says a block without exercises is not written yet', () => {
    // arrange
    const view = withFirstBlock(viewAt(TODAY), block => ({ ...block, sessions: block.sessions.map(session => ({ ...session, rows: [] })) }));

    // act
    renderViewer(view);

    // assert
    expect(screen.getByText("This block isn't written yet")).toBeInTheDocument();
    expect(screen.getByText('Foundation is not written.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

describe('ProgramViewer day', () => {
  function table(name: string): HTMLElement {
    return screen.getByRole('table', { name: `Sets for ${name}` });
  }

  function mainLift(view: ProgramView): { name: string; swaps: string[] } {
    const row = currentBlockOf(view).sessions[0].rows[0];
    const nameOf = (id: string) => view.exercisesById.get(id)?.name ?? '';
    return { name: nameOf(row.exerciseId), swaps: row.substitutions.map(nameOf) };
  }

  it('lists every set as a table row with its mark, reps, RIR and weight', () => {
    // arrange
    const view = withFirstBlock(viewAt(SESSION_DAY), block => ({
      ...block,
      sessions: block.sessions.map(session => ({
        ...session,
        rows: session.rows.map(row => (row.slot === 'A' ? { ...row, startSets: row.startSets.map(set => (set.kind === 'working' ? { ...set, start: { ...set.start, weightKg: 40 } } : set)) } : row)),
      })),
    }));

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR', 'Weight']);
    const rows = within(sets).getAllByRole('row').slice(1);
    expect(rows.map(row => within(row).getByRole('rowheader').textContent)).toEqual(['WWarm-up set 1', 'WWarm-up set 2', '1Set 1', '2Set 2', '3Set 3']);
    expect(within(rows[0]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['8, warm-up', '–none', 'lighter']);
    expect(within(rows[2]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['12–15', '3', '40 kg']);
  });

  it('leaves the weight column out when no set suggests a weight', () => {
    // arrange
    const view = viewAt(SESSION_DAY);

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR']);
    expect(within(sets).queryByText('by RIR')).not.toBeInTheDocument();
  });

  it('sets the unit of a per-side or timed exercise after every reps value under a Reps head', () => {
    // arrange
    const view = viewAt(SESSION_DAY);
    const rows = currentBlockOf(view).sessions[0].rows;
    const perSide = rows.find(row => view.exercisesById.get(row.exerciseId)?.perSide);
    if (!perSide) throw new Error('no per-side exercise');
    const name = view.exercisesById.get(perSide.exerciseId)?.name ?? '';

    // act
    renderViewer(view);

    // assert
    const sets = table(name);
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR']);
    const repsCells = within(sets).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0]);
    expect(repsCells.every(cell => /per side$/.test(cell.textContent ?? ''))).toBe(true);
  });

  it('reads "How to read this" as the reference card does: reps, RIR closed by the no-weight text, and the warm-up set', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(SESSION_DAY));

    // act
    await user.click(screen.getByRole('button', { name: 'How to read this' }));

    // assert
    const panel = screen.getByRole('region', { name: 'How to read this' });
    expect(within(panel).getAllByRole('term').map(term => term.textContent)).toEqual(['Reps 8–10', 'RIR 2', 'Warm-up set']);
    const rir = within(panel).getByText('RIR 2').nextElementSibling;
    expect(rir).toHaveTextContent(/RIR 0 means to failure, with good form\. No weight listed\? Pick one that lets you finish the set at the RIR shown\.$/);
    expect(within(panel).queryByText('by RIR')).not.toBeInTheDocument();
  });

  it('groups a superset under one label with one rest', () => {
    // arrange
    const view = viewAt(SESSION_DAY);

    // act
    renderViewer(view);

    // assert
    const superset = screen.getByRole('list', { name: 'Superset' });
    expect(within(superset).getAllByRole('table')).toHaveLength(2);
    expect(within(superset).queryByText('Rest')).not.toBeInTheDocument();
    expect(screen.getByText(/^Alternate C1 and C2\./)).toHaveTextContent('Alternate C1 and C2. Rest 1:15 after C2.');
  });

  it('opens the exercise detail from its name, with its targets and muscles, and returns focus on close', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(SESSION_DAY);
    const { name } = mainLift(view);
    renderViewer(view);
    expect(screen.queryByText('Muscles worked')).not.toBeInTheDocument();
    const opener = screen.getByRole('button', { name: new RegExp(`^${name}$`), description: /^cues/ });

    // act
    await user.click(opener);

    // assert
    const detail = screen.getByRole('dialog', { name });
    expect(within(detail).getByRole('heading', { name: 'Targets' })).toBeInTheDocument();
    expect(within(detail).getByRole('heading', { name: 'Muscles worked' })).toBeInTheDocument();
    expect(within(detail).getByText('Primary')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("notes a custom progression rule only under the exercises whose rule has words of the coach's own", () => {
    // arrange
    const rule = 'Add 2.5 kg once every set moves cleanly.';
    const view = withFirstBlock(viewAt(SESSION_DAY), block => ({
      ...block,
      sessions: block.sessions.map(session => ({
        ...session,
        rows: session.rows.map((row, index) => ({ ...row, progression: { kind: 'custom' as const, text: index === 0 ? rule : '' } })),
      })),
    }));

    // act
    renderViewer(view);

    // assert
    const notes = screen.getAllByText('How to progress.').map(label => label.parentElement?.textContent);
    expect(notes).toEqual([`How to progress. ${rule}`]);
  });

  it('keeps the swaps behind a disclosure and opens each swap in its own detail', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(SESSION_DAY);
    const { name, swaps } = mainLift(view);
    renderViewer(view);
    expect(screen.queryByRole('list', { name: `Swaps for ${name}` })).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: `${swaps.length} swaps for ${name}` }));
    const list = screen.getByRole('list', { name: `Swaps for ${name}` });
    await user.click(within(list).getByRole('button', { name: new RegExp(`^${swaps[0]}`) }));

    // assert
    expect(screen.getByText(`Same sets, reps and RIR as ${name}.`)).toBeInTheDocument();
    const detail = screen.getByRole('dialog', { name: swaps[0] });
    expect(within(detail).getByText(`Swap for A · ${name}`)).toBeInTheDocument();
    expect(within(detail).getByRole('heading', { name: 'Do it instead, with the same targets' })).toBeInTheDocument();
    await user.click(within(detail).getByRole('button', { name: `Back to ${name}` }));
    expect(screen.getByRole('dialog', { name })).toBeInTheDocument();
  });

  it('opens the detail of a warm-up exercise and lists its amount', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(SESSION_DAY);
    const item = currentBlockOf(view).sessions[0].warmUp.items[0];
    const name = view.exercisesById.get(item.exerciseId)?.name ?? '';
    renderViewer(view);
    const warmUp = screen.getByRole('region', { name: 'Warm-up' });

    // act
    await user.click(within(warmUp).getByRole('button', { name: new RegExp(`^${name}$`), description: /^cues/ }));

    // assert
    const detail = screen.getByRole('dialog', { name });
    expect(within(detail).queryByText(/^Warm-up · /)).not.toBeInTheDocument();
    expect(within(detail).queryByRole('heading', { name: 'Swaps' })).not.toBeInTheDocument();
  });

  it('lists the cool-down as its stretches with their seconds and leaves an empty one out', () => {
    // arrange
    const stretch = SAMPLE_EXERCISES.find(exercise => exercise.type === 'mobility');
    if (!stretch) throw new Error('no mobility exercise');
    const withCoolDown = withFirstBlock(viewAt(SESSION_DAY), block => ({
      ...block,
      sessions: block.sessions.map(session => ({ ...session, coolDown: { enabled: true, items: [{ id: 'cd', exerciseId: stretch.id, seconds: 30 }] } })),
    }));
    const withEmptyCoolDown = withFirstBlock(viewAt(SESSION_DAY), block => ({
      ...block,
      sessions: block.sessions.map(session => ({ ...session, coolDown: { enabled: true, items: [] } })),
    }));

    // act
    const { unmount } = renderViewer(withCoolDown);
    const coolDown = within(screen.getByRole('region', { name: 'Cool-down' })).getByRole('listitem').textContent;
    unmount();
    renderViewer(withEmptyCoolDown);

    // assert
    expect(coolDown).toMatch(new RegExp(`^${stretch.name}.*30 s`));
    expect(screen.queryByRole('region', { name: 'Cool-down' })).not.toBeInTheDocument();
  });

  it('renders a cardio day as numbered segments whose steps run in order, and explains its efforts only on request', async () => {
    // arrange
    const user = userEvent.setup();
    const view = withFirstBlock(viewAt(SESSION_DAY), block => {
      const replaced = block.cardioSessions[0];
      const intervals = { ...cardioPreset('hiit', SAMPLE_EXERCISES), id: replaced.id, originId: replaced.originId };
      return { ...block, cardioSessions: block.cardioSessions.map(cardio => (cardio.id === replaced.id ? intervals : cardio)) };
    });
    renderViewer(view);
    const cardioTab = screen.getAllByRole('tab').find(tab => /, Intervals$/.test(tab.textContent ?? ''));
    if (!cardioTab) throw new Error('no intervals day');

    // act
    await user.click(cardioTab);

    // assert
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { level: 3, name: 'Intervals' })).toBeInTheDocument();
    expect(within(panel).queryByText(/You can hold a conversation\./)).not.toBeInTheDocument();
    const segments = within(panel).getAllByRole('article');
    expect(segments).toHaveLength(3);
    const rowsOf = (segment: HTMLElement) => within(within(segment).getByRole('table')).getAllByRole('row').slice(1).map(row => row.textContent);
    expect(rowsOf(segments[0])).toEqual(['Steady5 minEasy']);
    expect(within(segments[1]).getByRole('heading', { level: 4, name: 'Intervals' })).toBeInTheDocument();
    expect(within(segments[1]).getByRole('table', { name: 'Segment 2, Intervals' })).toBeInTheDocument();
    const [rounds, work, easy, ...rest] = rowsOf(segments[1]);
    expect(rounds).toMatch(/^8 rounds · \d+ min, intensity Hard$/);
    expect(within(within(segments[1]).getByRole('table')).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Step', 'Time']);
    expect(within(segments[1]).getAllByText('Hard')).toHaveLength(1);
    expect(work).toMatch(/30 s$/);
    expect(easy).toBe('then1:30 easy');
    expect(rest).toEqual([]);
    expect(panel).not.toHaveTextContent('None');
  });

  it('opens the meaning of each effort on a cardio day from one closed question under the title', async () => {
    // arrange
    const user = userEvent.setup();
    const view = withFirstBlock(viewAt(SESSION_DAY), block => {
      const replaced = block.cardioSessions[0];
      const intervals = { ...cardioPreset('hiit', SAMPLE_EXERCISES), id: replaced.id, originId: replaced.originId };
      return { ...block, cardioSessions: block.cardioSessions.map(cardio => (cardio.id === replaced.id ? intervals : cardio)) };
    });
    renderViewer(view);
    const cardioTab = screen.getAllByRole('tab').find(tab => /, Intervals$/.test(tab.textContent ?? ''));
    if (!cardioTab) throw new Error('no intervals day');
    await user.click(cardioTab);
    const question = within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Effort levels' });
    expect(question).toHaveAttribute('aria-expanded', 'false');

    // act
    await user.click(question);

    // assert
    expect(question).toHaveAttribute('aria-expanded', 'true');
    const meanings = screen.getByRole('region', { name: 'Effort levels' });
    expect(within(meanings).getAllByRole('term').map(term => term.textContent)).toEqual(['Easy', 'Hard']);
    expect(within(meanings).getAllByRole('definition').map(definition => definition.textContent)).toEqual(['You can hold a conversation.', 'Only a few words at a time.']);
  });

  it("reads each week of a block at that week's targets: a calibration week without weights, then rising reps and a typed weight", () => {
    // arrange
    const weeks = [5, 6, 7, 8];
    const firstSetOf = (week: number) => {
      const view = viewAt(addDays(SESSION_DAY, (week - 1) * 7));
      const { unmount } = renderViewer(view);
      const firstWorking = within(table(mainLift(view).name)).getByRole('rowheader', { name: 'Set 1' }).closest('tr') as HTMLElement;
      const cells = within(firstWorking).getAllByRole('cell').map(cell => cell.textContent);
      unmount();
      return cells;
    };

    // act
    const firstSets = weeks.map(firstSetOf);

    // assert
    expect(firstSets).toEqual([
      ['6–10', '3'],
      ['6–10', '3', '60 kg'],
      ['7–10', '3', '60 kg'],
      ['8–10', '3', '65 kg'],
    ]);
  });

  it('reads each working set at its own RIR, the last one closer to failure', () => {
    // arrange
    const view = viewAt(addDays(SESSION_DAY, 6 * 7));

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    const working = within(sets).getAllByRole('rowheader', { name: /^Set \d$/ }).map(header => header.closest('tr') as HTMLElement);
    expect(working.map(row => within(row).getAllByRole('cell')[1].textContent)).toEqual(['3', '3', '3', '2']);
  });

  it("gives the exercise detail the targets of the week being read, with nothing marking them suggested or typed", async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(addDays(SESSION_DAY, 6 * 7));
    const { name } = mainLift(view);
    renderViewer(view);

    // act
    await user.click(screen.getByRole('button', { name: new RegExp(`^${name}$`), description: /^cues/ }));

    // assert
    const detail = screen.getByRole('dialog', { name });
    expect(within(detail).getByText('Working').nextElementSibling).toHaveTextContent(/^4 sets × \d+–10$/);
    expect(screen.queryByText(/suggested|typed|edited|step too large/i)).not.toBeInTheDocument();
  });

  it('reads a week with a heavier top set and its own extra warm-up set as each of its sets', () => {
    // arrange
    const view = viewAt(addDays(SESSION_DAY, 8 * 7));

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    const working = within(sets).getAllByRole('rowheader', { name: /^Set \d$/ }).map(header => header.closest('tr') as HTMLElement);
    const cells = working.map(row => within(row).getAllByRole('cell').map(cell => cell.textContent));
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual(['4–6', '2', '75 kg']);
    expect(cells.slice(1).every(cell => cell[2] === '60 kg')).toBe(true);
    expect(within(sets).getAllByRole('rowheader', { name: /^Warm-up set \d$/ })).toHaveLength(3);
  });

  it('reads a Deload week at its own halved sets and RIR 4', () => {
    // arrange
    const view = viewAt(addDays(SESSION_DAY, 10 * 7));

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    const working = within(sets).getAllByRole('rowheader', { name: /^Set \d$/ }).map(header => header.closest('tr') as HTMLElement);
    expect(working.map(row => within(row).getAllByRole('cell')[1].textContent)).toEqual(['4', '4']);
  });

  it('marks a calibration week on the block line and explains it once at the top of the day', () => {
    // arrange
    const view = withFirstBlock(viewAt(SESSION_DAY), block => ({ ...block, calibrationWeek: true }));

    // act
    renderViewer(view);

    // assert
    expect(within(screen.getByRole('region', { name: /^Week 1 of 11/ })).getAllByText('Calibration week').length).toBeGreaterThan(0);
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Week 1 — finding your weights.').tagName).toBe('STRONG');
    expect(within(panel).getAllByText(/finding your weights/)).toHaveLength(1);
  });
});

describe('ProgramViewer texts and versions', () => {
  it('opens the block, split and steps texts behind the split name, in that order, and closes them from it', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));
    const week = screen.getByRole('region', { name: /^Week 1 of 11/ });
    const split = within(week).getByRole('button', { name: 'Full Body' });

    // act
    await user.click(split);

    // assert
    const texts = within(week).getByRole('region', { name: 'Full Body' });
    const headings = within(texts).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent ?? '');
    expect(headings).toHaveLength(3);
    expect(headings[0]).toMatch(/^Building your base/);
    expect(headings[1]).toMatch(/^Your split: Full Body/);
    expect(headings[2]).toBe('Daily steps');
    expect(texts).not.toHaveTextContent(dailyStepsText(currentBlockOf(viewAt(TODAY))));
    expect(texts).toHaveTextContent(/If you miss a session/);
    expect(within(texts).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    // act
    await user.click(split);

    // assert
    expect(within(week).queryByRole('region', { name: 'Full Body' })).not.toBeInTheDocument();
    expect(split).toHaveAttribute('aria-expanded', 'false');
    expect(split).toHaveFocus();
  });

  it('opens how to read the session and the low-energy option under the day title, and the warm-up text in its band', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(SESSION_DAY));
    const day = screen.getByRole('tabpanel');

    // act
    await user.click(within(day).getByRole('button', { name: 'How to read this' }));
    await user.click(within(day).getByRole('button', { name: 'Low energy today?' }));

    // assert
    expect(within(day).getByRole('button', { name: 'How to read this' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(day).getByRole('region', { name: 'Low energy today?' })).toHaveTextContent(/Low-energy session/);

    // act
    await user.click(within(day).getByRole('button', { name: 'How to warm up' }));

    // assert
    const warmUp = within(day).getByRole('region', { name: 'How to warm up' });
    expect(within(warmUp).getByRole('heading', { level: 4, name: /^Warm-up/ })).toBeInTheDocument();
    expect(within(day).getByRole('region', { name: 'Low energy today?' })).toBeInTheDocument();
  });

  it('leads the plan with the focus and the note the coach wrote, and keeps nutrition and lifestyle in one small panel', () => {
    // arrange
    const view = viewAt(TODAY);
    const content = {
      ...view.version.content,
      header: { ...view.version.content.header, focus: 'Quality over weight.', personalNote: 'So glad to start with you.' },
      nutritionNotes: 'Protein at every meal.',
      lifestyleNotes: 'Sleep eight hours.',
    };

    // act
    renderViewer({ ...view, version: { ...view.version, content } });

    // assert
    const plan = screen.getByRole('region', { name: 'Plan' });
    expect(within(plan).getAllByRole('term').map(term => term.textContent)).toEqual(['Your focus', 'A note from your coach', 'Plan', 'Next check-in form']);
    expect(within(plan).getByText('Quality over weight.')).toBeInTheDocument();
    expect(within(plan).getByText('So glad to start with you.')).toBeInTheDocument();
    const topics = within(screen.getByRole('region', { name: 'Nutrition and lifestyle' })).getAllByRole('button');
    expect(topics.map(topic => topic.textContent)).toEqual(['Nutrition', 'Lifestyle']);
    expect(topics.every(topic => topic.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('leaves out the nutrition and lifestyle panel and every unwritten text', () => {
    // arrange
    const view = viewAt(SESSION_DAY);
    const content = { ...view.version.content, guideTexts: { ...view.version.content.guideTexts, legend: ' ', noWeight: ' ' } };

    // act
    renderViewer({ ...view, version: { ...view.version, content } });

    // assert
    expect(screen.queryByRole('region', { name: /Nutrition|Lifestyle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'How to read this' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Low energy today?' })).toBeInTheDocument();
  });

  it('lists the versions newest first with the action the page gives each', () => {
    // arrange / act
    renderViewer(viewAt(TODAY));

    // assert
    const versions = screen.getByRole('region', { name: 'Versions' });
    expect(within(versions).getByText('Version 1')).toBeInTheDocument();
    expect(within(versions).getByText('Published')).toBeInTheDocument();
    expect(within(versions).getByRole('link', { name: 'Download PDF, version 1' })).toHaveAttribute('href', '/document/1');
  });
});
