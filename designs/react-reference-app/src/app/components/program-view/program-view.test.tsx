import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { currentBlockOf } from '../../../test/programFixtures';
import type { Exercise } from '../../context/TrainingContext';
import { currentVersion, type Block, type ProgramVersion, type Session } from '../../domain/program';
import { cardioPreset } from '../../domain/programCardio';
import { programForSeed } from '../../services/programSamples';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { ProgramViewer } from './ProgramViewer';
import { SessionTable } from './SessionTable';
import { ClientProgramView } from '../client-portal/ClientProgramView';
import { viewOf, type ProgramView } from './programView';
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
  const program = programForSeed('published', { callId: 'ac-demo-client-1', dayOne: DAY_ONE, equipment: [] }, SAMPLE_EXERCISES);
  if (!program) throw new Error('seed missing');
  const version = currentVersion(program);
  if (!version) throw new Error('version missing');
  return viewOf({ program, version, dayOne: DAY_ONE, today, preferredWeekday: 'mon', exercises });
}

function sessionWith(view: ProgramView, edit: (session: Session) => Session): Session {
  return edit(currentBlockOf(view).sessions[0]);
}

function withFirstBlock(view: ProgramView, edit: (block: Block) => Block): ProgramView {
  const [first, ...rest] = view.version.content.plan.blocks;
  const version: ProgramVersion = { ...view.version, content: { ...view.version.content, plan: { blocks: [edit(first), ...rest] } } };
  return { ...view, version };
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

const WHAT_CHANGED = /What changed in version/;

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
    expect(notice).toHaveTextContent('What changed in version 2. Raised steps to 8,000.');

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
    const tabs = within(screen.getByRole('tablist', { name: 'Days of week 1 of 11' })).getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(tabs[0]).toHaveAccessibleName(/^Wednesday 16 September, /);
    expect(tabs[6]).toHaveAccessibleName(/^Tuesday 22 September, .+, today$/);
    expect(tabs[6]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[6]).toHaveAttribute('aria-current', 'date');
    expect(tabs.filter(tab => tab.hasAttribute('aria-controls'))).toEqual([tabs[6]]);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('moves between days with the arrow, Home and End keys', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));
    const tabs = screen.getAllByRole('tab');
    tabs[6].focus();

    // act
    await user.keyboard('{Home}');
    const afterHome = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    await user.keyboard('{ArrowRight}');
    const afterArrow = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    await user.keyboard('{End}');

    // assert
    expect(afterHome).toBe(0);
    expect(afterArrow).toBe(1);
    expect(tabs[6]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[6]).toHaveFocus();
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

  it('shows all seven days and turns the rail into links when All days is pressed', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(TODAY));

    // act
    await user.click(screen.getByRole('button', { name: 'All days' }));

    // assert
    expect(screen.getByRole('button', { name: 'All days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    const rail = screen.getByRole('navigation', { name: 'Days of week 1 of 11' });
    expect(within(rail).getAllByRole('link')).toHaveLength(7);
    expect(screen.getAllByRole('heading', { level: 3 }).filter(heading => heading.id.startsWith('program-day-'))).toHaveLength(7);
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
        rows: session.rows.map(row => (row.slot === 'A' ? { ...row, sets: row.sets.map(set => (set.kind === 'working' ? { ...set, weightKg: 40 } : set)) } : row)),
      })),
    }));

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR', 'Weight']);
    const rows = within(sets).getAllByRole('row').slice(1);
    expect(rows.map(row => within(row).getByRole('rowheader').textContent)).toEqual(['WWarm-up set 1', 'WWarm-up set 2', '1Set 1', '2Set 2', '3Set 3']);
    expect(within(rows[0]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['8warm-up', '–none', 'lighter']);
    expect(within(rows[2]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['12–15', '3', '40 kg']);
  });

  it('leaves the weight column out and says once that the weight is her choice', () => {
    // arrange
    const view = viewAt(SESSION_DAY);

    // act
    renderViewer(view);

    // assert
    const sets = table(mainLift(view).name);
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR']);
    expect(within(sets).queryByText('by RIR')).not.toBeInTheDocument();
    expect(screen.queryByText('Your choice, by RIR')).not.toBeInTheDocument();
  });

  it('says in "How to read this" that the weight is her choice when none is listed', async () => {
    // arrange
    const user = userEvent.setup();
    renderViewer(viewAt(SESSION_DAY));

    // act
    await user.click(screen.getByRole('button', { name: 'How to read this' }));

    // assert
    const panel = screen.getByRole('region', { name: 'How to read this' });
    expect(within(panel).getByText('No weight listed')).toBeInTheDocument();
    expect(within(panel).getByText('Pick one that lets you finish the set at the RIR shown.')).toBeInTheDocument();
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
    const opener = screen.getByRole('button', { name: new RegExp(`^${name} ?: cues`) });

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
    await user.click(within(warmUp).getByRole('button', { name: new RegExp(`^${name} ?: cues`) }));

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

  it('designs the rest day and links to the next session', async () => {
    // arrange
    const user = userEvent.setup();
    const view = viewAt(SESSION_DAY);
    renderViewer(view);
    const restTab = screen.getAllByRole('tab').find(tab => /, Rest$/.test(tab.getAttribute('aria-label') ?? tab.textContent ?? ''));
    if (!restTab) throw new Error('no rest day');

    // act
    await user.click(restTab);

    // assert
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { level: 3, name: 'Rest' })).toBeInTheDocument();
    expect(within(panel).getByText(/Keep to your daily steps:/)).toBeInTheDocument();
    expect(within(panel).queryByText(/No session and no cardio today/)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /^Next: / }));
    expect(within(screen.getByRole('tabpanel')).queryByRole('heading', { level: 3, name: 'Rest' })).not.toBeInTheDocument();
  });

  it('renders a cardio day as numbered segments whose steps run in order, with the effort key under the title and its hint on the Effort head', async () => {
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
    expect(within(panel).getAllByRole('term').map(term => term.textContent)).toEqual(['Easy', 'Hard']);
    expect(within(panel).getAllByText(/You can hold a conversation\.|Only a few words at a time\./)).toHaveLength(2);
    const segments = within(panel).getAllByRole('article');
    expect(segments).toHaveLength(3);
    const rowsOf = (segment: HTMLElement) => within(within(segment).getByRole('table')).getAllByRole('row').slice(1).map(row => row.textContent);
    expect(rowsOf(segments[0])).toEqual(['Steady5 minEasy']);
    expect(within(segments[1]).getByRole('heading', { level: 4, name: 'Intervals' })).toBeInTheDocument();
    expect(within(segments[1]).getByRole('table', { name: 'Segment 2, Intervals' })).toBeInTheDocument();
    const [rounds, work, easy, ...rest] = rowsOf(segments[1]);
    expect(rounds).toMatch(/^8 rounds\d+ min$/);
    expect(work).toMatch(/30 sHard$/);
    expect(easy).toBe('then1:30Easy');
    expect(rest).toEqual([]);
    expect(panel).not.toHaveTextContent('None');
    expect(within(segments[1]).queryByRole('button', { name: 'What each effort means' })).not.toBeInTheDocument();

    // act
    await user.hover(within(segments[0]).getByRole('button', { name: 'What each effort means' }));

    // assert
    const hint = await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent === 'Hard: Only a few words at a time.');
    expect(hint).toBeVisible();
    expect(within(segments[0]).getByRole('button', { name: 'What each effort means' })).toHaveAccessibleDescription(/^Easy: You can hold a conversation\. ?Hard: Only a few words at a time\.$/);
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
    expect(headings[0]).toMatch(/^Foundation block — building your base/);
    expect(headings[1]).toMatch(/^Your split: Full Body/);
    expect(headings[2]).toMatch(/^Daily steps: /);
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

  const FOUR_WEEKS = { weeks: 4, calibrationWeek: false };

  function renderSession(session: Session, block = FOUR_WEEKS) {
    const exercises = new Map(SAMPLE_EXERCISES.map(exercise => [exercise.id, exercise]));
    return render(<SessionTable session={session} block={block} exercisesById={exercises} />);
  }

  function exerciseHeaders(): HTMLElement[] {
    return screen.getAllByRole('rowheader').filter(header => header.getAttribute('scope') === 'rowgroup');
  }

  it('prints a superset rest once, after its last exercise, in minutes from 90 s, and shows the unit', () => {
    // arrange
    const view = viewAt(TODAY);

    // act
    renderSession(superset(view));

    // assert
    const [first, second] = exerciseHeaders();
    expect(first).toHaveTextContent(/^C1 /);
    expect(first).not.toHaveTextContent(/Rest|Superset/);
    expect(second).toHaveTextContent(/^C2 .+ Rest 1:30 after C2/);
    expect(screen.getAllByText(/\/side/).length).toBeGreaterThan(0);
  });

  it('prints a rest from a minute as m:ss and leaves the swaps out of the table', () => {
    // arrange
    const view = viewAt(TODAY);
    const [, swap] = SAMPLE_EXERCISES;
    const session = sessionWith(view, original => ({ ...original, rows: [{ ...original.rows[0], restSeconds: 75, substitutions: [swap.id] }] }));

    // act
    renderSession(session);

    // assert
    expect(exerciseHeaders()[0]).toHaveTextContent('Rest 1:15');
    expect(exerciseHeaders()[0]).not.toHaveTextContent(swap.name);
  });

  it('links each exercise name to its exercise page', () => {
    // arrange
    const view = viewAt(TODAY);
    const session = sessionWith(view, current => current);
    const [row] = session.rows;
    const name = SAMPLE_EXERCISES.find(exercise => exercise.id === row.exerciseId)?.name ?? '';

    // act
    renderSession(session);

    // assert
    expect(within(exerciseHeaders()[0]).getByRole('link', { name })).toHaveAttribute('href', `${window.location.origin}/portal/exercises/${row.exerciseId}`);
  });

  it('describes warm-up sets in a line under the name and gives each working set its reps, weight, RIR and a box per week', () => {
    // arrange
    const view = viewAt(TODAY);
    const warmUp = { kind: 'warm-up' as const, reps: { min: 10, max: 10 } };
    const top = { kind: 'working' as const, reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 }, weightKg: 60 };
    const steady = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };
    const session = sessionWith(view, original => ({ ...original, rows: [{ ...original.rows[0], sets: [warmUp, warmUp, top, steady] }] }));

    // act
    renderSession(session);

    // assert
    const [, , , ...rows] = screen.getAllByRole('row', { hidden: true });
    const setOf = (index: number) => within(rows[index]).getByRole('rowheader').textContent;
    const cellsOf = (index: number) => within(rows[index]).getAllByRole('cell', { hidden: true }).map(cell => cell.textContent);
    expect(exerciseHeaders()[0]).toHaveTextContent('Warm up first: 10, then 10 reps, lighter than your working sets. No need to log them.');
    expect(rows).toHaveLength(2);
    expect([setOf(0), setOf(1)]).toEqual(['1', '2']);
    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'Weight', 'RIR']);
    expect(cellsOf(0)).toEqual(['5', '60 kg', '2', '', '', '', '']);
    expect(cellsOf(1)).toEqual(['8–10', '', '1–2', '', '', '', '']);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('leaves the weight column out when no set prescribes a weight', () => {
    // arrange
    const view = viewAt(TODAY);
    const steady = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };
    const session = sessionWith(view, original => ({ ...original, rows: [{ ...original.rows[0], sets: [steady] }] }));

    // act
    renderSession(session);

    // assert
    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR']);
  });

  it('prints the cues the coach wrote for her and a custom progression under the exercise', () => {
    // arrange
    const view = viewAt(TODAY);
    const [, swap] = SAMPLE_EXERCISES;
    const session = sessionWith(view, original => ({
      ...original,
      rows: [
        {
          ...original.rows[0],
          cues: 'Brace first',
          touched: ['cues' as const],
          substitutions: [swap.id],
          progression: { kind: 'custom' as const, text: 'Add 2 kg weekly' },
        },
        { ...original.rows[1], cues: 'Library description', touched: [] },
      ],
    }));

    // act
    renderSession(session);

    // assert
    const [tailored, standard] = exerciseHeaders();
    expect(tailored).toHaveTextContent('Brace first');
    expect(tailored).toHaveTextContent('Add 2 kg weekly');
    expect(standard).not.toHaveTextContent('Library description');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('heads a log column for each week of the block, marking the calibration week', () => {
    // arrange
    const view = viewAt(TODAY);
    const session = sessionWith(view, current => current);

    // act
    renderSession(session, { weeks: 6, calibrationWeek: true });

    // assert
    const logHeaders = screen.getAllByRole('columnheader', { hidden: true }).slice(3);
    expect(logHeaders.map(header => header.textContent)).toEqual(['Log: kg × reps', 'Week 1 calibration', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6']);
    expect(logHeaders.every(header => header.getAttribute('aria-hidden') === 'true')).toBe(true);
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
    render(<SessionTable session={{ ...session, rows }} block={FOUR_WEEKS} exercisesById={exercises} />);

    // assert
    expect(screen.getByRole('rowheader', { name: new RegExp(`^${first.slot} ${archived.name}`) })).toBeInTheDocument();
    expect(screen.getByText('Exercise removed')).toBeInTheDocument();
  });
});
