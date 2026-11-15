import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { currentBlockOf } from '../../../test/programFixtures';
import { BLOCK_TYPE_LABELS, currentVersion, positionLabel, warmUpItemText, WEEKDAYS, workingSets, type Weekday } from '../../domain/program';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { programForSeed } from '../../services/programSamples';
import { ProgramDocument } from './ProgramDocument';
import { parseTemplate, programTemplate } from './ProgramText';
import { viewOf, type ProgramView } from './programView';

const DAY_ONE = new Date(2026, 8, 16);
const TODAY = new Date(2026, 8, 22);

function viewFor(seed: 'published' | 'two-versions' = 'published', dayOne: Date | null = DAY_ONE): ProgramView {
  const program = programForSeed(seed, { callId: 'ac-demo-client-1', dayOne: DAY_ONE, equipment: [] }, SAMPLE_EXERCISES);
  if (!program) throw new Error('seed missing');
  const version = currentVersion(program);
  if (!version) throw new Error('version missing');
  return viewOf({
    program,
    version,
    dayOne,
    today: TODAY,
    preferredWeekday: 'mon',
    exercises: SAMPLE_EXERCISES,
    clientName: 'Ana Pop',
  });
}

describe('ProgramDocument', () => {
  it('opens with a cover band naming the client, version, date and coach on one line', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const cover = screen.getByRole('banner');
    expect(within(cover).getByRole('heading', { level: 1, name: 'Ana Pop' })).toBeInTheDocument();
    expect(within(cover).getByText(/^Version 1 · \d{1,2} \w+ 2026 · Coach Eli$/)).toBeInTheDocument();
  });

  it("carries the coach's title, personal note and missed-day note", () => {
    // arrange
    const view = viewFor();
    const { content } = view.version;
    content.header = { title: 'Your first program', focus: '', personalNote: 'So glad to start with you' };
    currentBlockOf(view).missedDayNote = 'Missed one? Pick up with the next session.';

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByText('Your first program')).toBeInTheDocument();
    expect(screen.getByText('So glad to start with you')).toBeInTheDocument();
    const missedDay = screen.getByText('Missed one?').parentElement;
    expect(missedDay).toHaveTextContent('Missed one?Pick up with the next session.');
  });

  it('states each fact once: the current block on the plan strip, the steps in their own section', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const steps = block.dailySteps.toLocaleString('en-US');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const plan = screen.getByRole('region', { name: 'Plan' });
    expect(within(plan).getByRole('listitem', { current: true })).toHaveTextContent(`${BLOCK_TYPE_LABELS[block.type]}Now${block.weeks} weeks · 16 Sep–13 Oct`);
    expect(screen.getByRole('banner')).not.toHaveTextContent(steps);
    expect(screen.getAllByText(new RegExp(steps))).toHaveLength(1);
    expect(screen.queryByText(/^Block 1 of/)).not.toBeInTheDocument();
  });

  it('lays the whole block out as weeks of seven dated days, her weeks starting on her first day', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const firstDay: Weekday = 'wed';
    const order = [...WEEKDAYS.slice(WEEKDAYS.indexOf(firstDay)), ...WEEKDAYS.slice(0, WEEKDAYS.indexOf(firstDay))];

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: 'Calendar' });
    const [, ...weeks] = within(calendar).getAllByRole('row');
    expect(weeks).toHaveLength(block.weeks);
    expect(within(calendar).getAllByRole('columnheader').map(header => header.textContent)).toEqual(order.map(day => day[0].toUpperCase() + day.slice(1)));
    expect(within(weeks[0]).getByRole('rowheader')).toHaveTextContent('Week 1 16–22 Sep');
    for (const week of weeks) expect(within(week).getAllByRole('cell')).toHaveLength(7);
    expect(within(weeks[0]).getAllByRole('cell')[0].querySelector('time')).toHaveAttribute('datetime', '2026-09-16');
  });

  it('prints a tick box on every training and cardio day and none on a rest day', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const order: Weekday[] = ['wed', 'thu', 'fri', 'sat', 'sun', 'mon', 'tue'];
    const restDays = order.filter(day => block.calendar[day].kind === 'rest').length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: 'Calendar' });
    const [, ...weeks] = within(calendar).getAllByRole('row');
    for (const week of weeks) {
      const cells = within(week).getAllByRole('cell');
      cells.forEach((cell, index) => {
        const rests = block.calendar[order[index]].kind === 'rest';
        expect(cell).toHaveTextContent(rests ? /Rest$/ : /\S/);
        expect(cell.querySelectorAll('[data-print-only]')).toHaveLength(rests ? 0 : 1);
      });
    }
    expect(calendar.querySelectorAll('[data-print-only]')).toHaveLength(block.weeks * (7 - restDays));
  });

  it('marks the check-in form days that fall inside the block', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: 'Calendar' });
    const checkIns = within(calendar).getAllByRole('cell').filter(cell => cell.textContent?.includes('check-in form due'));
    expect(checkIns.map(cell => cell.querySelector('time')?.getAttribute('datetime'))).toEqual(['2026-10-05']);
    expect(screen.getByText('Check-in form due · Mon 5 Oct')).toBeInTheDocument();
  });

  it('lays the block out from Monday without dates or check-ins before the plan has a first day', () => {
    // arrange
    const view = viewFor('published', null);
    const block = currentBlockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: 'Calendar' });
    expect(within(calendar).getAllByRole('columnheader')[0]).toHaveTextContent('Mon');
    expect(calendar.querySelector('time')).toBeNull();
    expect(screen.queryByText(/^Check-in form due/)).not.toBeInTheDocument();
  });

  it('prints each exercise once, headed by its letter, with a row per set and a log column per week', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const [session] = block.sessions;
    const [row] = session.rows;
    const name = view.exercisesById.get(row.exerciseId)?.name ?? '';
    const setCount = session.rows.reduce((total, candidate) => total + workingSets(candidate.sets).length, 0);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const table = screen.getByRole('table', { name: `${session.name} exercises` });
    const [, , ...body] = within(table).getAllByRole('row', { hidden: true });
    expect(body).toHaveLength(setCount + session.rows.length);
    expect(within(table).getAllByRole('rowheader', { name: new RegExp(`^${row.slot} ${name}`) })).toHaveLength(1);
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Reps', 'RIR']);
    const logHeaders = within(table).getAllByRole('columnheader', { hidden: true }).slice(3);
    expect(logHeaders.map(header => header.textContent)).toEqual(['Log: kg × reps', ...Array.from({ length: block.weeks }, (_, index) => `Week ${index + 1}`)]);
    expect(table).not.toHaveTextContent('—');
  });

  it('lists each exercise with swaps after the session, naming the exercise and linking every swap to its exercise page', () => {
    // arrange
    const view = viewFor();
    const [session] = currentBlockOf(view).sessions;
    const withSwaps = session.rows.filter(row => row.substitutions.length > 0);
    const [row] = withSwaps;
    const [swapId] = row.substitutions;
    const linkTo = (id: string) => `${window.location.origin}/portal/exercises/${id}`;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const swaps = screen.getByRole('region', { name: `${session.name} swaps` });
    const terms = within(swaps).getAllByRole('term');
    expect(withSwaps.length).toBeGreaterThan(0);
    expect(terms).toHaveLength(withSwaps.length);
    expect(terms[0]).toHaveTextContent(`${positionLabel(session, row)} ${view.exercisesById.get(row.exerciseId)?.name}`);
    expect(within(terms[0]).queryByRole('link')).not.toBeInTheDocument();
    const swapLink = within(within(swaps).getAllByRole('definition')[0]).getByRole('link', { name: view.exercisesById.get(swapId)?.name });
    expect(swapLink).toHaveAttribute('href', linkTo(swapId));
  });

  it('links the warm-up and cardio exercises to their exercise pages', () => {
    // arrange
    const view = viewFor('two-versions');
    const block = currentBlockOf(view);
    const [session] = block.sessions;
    const [warmUp] = session.warmUp.items;
    const [cardio] = block.cardioSessions;
    const [segment] = cardio.segments;
    if (segment.kind !== 'steady') throw new Error('steady segment missing');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: session.name });
    expect(within(card).getAllByRole('link', { name: view.exercisesById.get(warmUp.exerciseId)?.name })[0]).toHaveAttribute(
      'href',
      `${window.location.origin}/portal/exercises/${warmUp.exerciseId}`,
    );
    expect(within(screen.getByRole('region', { name: cardio.name })).getByRole('link')).toHaveAttribute('href', `${window.location.origin}/portal/exercises/${segment.exerciseId}`);
  });

  it('prints no identifiers, no video links and the legend heading once', () => {
    // arrange
    const view = viewFor();

    // act
    const { container } = render(<ProgramDocument view={view} />);

    // assert
    expect(container).not.toHaveTextContent('full-body');
    expect(container).not.toHaveTextContent('**');
    expect(screen.queryByText(/watch video/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('How to read your session')).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'How to read your session' })).toBeInTheDocument();
  });

  it('explains once, in the legend, that the exercise names open their exercise pages', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const legend = screen.getByRole('complementary', { name: 'How to read your session' });
    const terms = within(legend).getAllByRole('term');
    const definitions = within(legend).getAllByRole('definition');
    expect(terms.at(-1)).toHaveTextContent('Exercise names');
    expect(definitions.at(-1)).toHaveTextContent('Tap one for its video and how-to.');
    expect(screen.getAllByText('Exercise names')).toHaveLength(1);
  });

  it('lists the plan, a log table per session, the low-energy session without a repeated title and the disclaimer', () => {
    // arrange
    const view = viewFor();
    const sessionCount = currentBlockOf(view).sessions.length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('region', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Your (plan|sessions)$/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Low-energy session' })).queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Low-energy session (20–30 min):')).toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: / exercises$/ })).toHaveLength(sessionCount);
    expect(screen.getByRole('contentinfo')).toHaveTextContent("See your coach's disclaimer.");
  });

  it('titles the block section with the intro template line, never a generic heading as well', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const { title } = parseTemplate(block.introText || programTemplate(view, `block.${block.type}`));

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: `${BLOCK_TYPE_LABELS[block.type]} block` })).not.toBeInTheDocument();
  });

  it('titles the split and steps sections with their template lines', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const split = parseTemplate(block.split.text).title;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: split })).toBeInTheDocument();
    expect(screen.getAllByText(split)).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: `Daily steps: ${block.dailySteps.toLocaleString('en-US')}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Calendar' })).toBeInTheDocument();
    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
  });

  it('lists each warm-up exercise with its sets and amount on the session card', () => {
    // arrange
    const view = viewFor();
    const [session] = currentBlockOf(view).sessions;
    const lines = session.warmUp.items.map(item => `${view.exercisesById.get(item.exerciseId)?.name} · ${warmUpItemText(item)}`);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: session.name });
    expect(lines.length).toBeGreaterThan(0);
    expect(within(card).getByRole('heading', { level: 3, name: 'Warm-up' })).toBeInTheDocument();
    const items = within(card).getAllByRole('listitem').map(item => item.textContent);
    for (const line of lines) expect(items).toContain(line);
  });

  it('prints the cool-down note and stretches when the cool-down is on', () => {
    // arrange
    const view = viewFor();
    const [session] = currentBlockOf(view).sessions;
    const [stretch] = SAMPLE_EXERCISES;
    session.coolDown = { enabled: true, note: 'Walk easy for five minutes.', items: [{ id: 'cd-1', exerciseId: stretch.id, seconds: 30 }] };

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: session.name });
    expect(within(card).getByRole('heading', { level: 3, name: 'Cool-down' })).toBeInTheDocument();
    expect(within(card).getByText('Walk easy for five minutes.')).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem').map(item => item.textContent)).toContain(`${stretch.name} · 30 s`);
  });

  it('prints a one-exercise intervals segment as rounds of work and easy time, numbering only several segments', () => {
    // arrange
    const view = viewFor('two-versions');
    const cardio = currentBlockOf(view).cardioSessions.find(candidate => candidate.segments.some(segment => segment.kind === 'rounds'));
    if (!cardio) throw new Error('rounds cardio missing');
    const rounds = cardio.segments.find(segment => segment.kind === 'rounds');
    if (rounds?.kind !== 'rounds') throw new Error('rounds segment missing');
    const [item] = rounds.items;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const card = screen.getByRole('region', { name: cardio.name });
    const name = view.exercisesById.get(item.exerciseId)?.name;
    expect(within(card).getAllByRole('listitem').map(entry => entry.textContent)).toContain(
      `${name} · ${rounds.rounds} × (${item.workSeconds} s ${rounds.intensity} / ${rounds.easySeconds} s easy)`,
    );
    expect(within(card).queryByText(/between rounds/)).not.toBeInTheDocument();
    const single = currentBlockOf(view).cardioSessions.find(candidate => candidate.segments.length === 1);
    if (!single) throw new Error('single-segment cardio missing');
    expect(within(screen.getByRole('region', { name: single.name })).queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows what changed from version 2', () => {
    // arrange
    const view = viewFor('two-versions');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'What changed in v2' })).toBeInTheDocument();
  });

  it('leaves out every optional text the coach did not write', () => {
    // arrange
    const view = viewFor('two-versions');
    const { content } = view.version;
    view.version.whatChanged = ' ';
    content.header = { ...content.header, focus: '', personalNote: '' };
    content.nutritionNotes = '';
    content.lifestyleNotes = '';
    currentBlockOf(view).clientNote = '';

    // act
    const { container } = render(<ProgramDocument view={view} />);

    // assert
    expect(screen.queryByRole('region', { name: 'What changed in v2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Nutrition' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lifestyle' })).not.toBeInTheDocument();
    expect(screen.queryByText(/A note from/)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('Your coach will add nutrition guidance here.');
    expect(container).not.toHaveTextContent('Nothing extra this time.');
  });

  it('prints the written nutrition and lifestyle guidance', () => {
    // arrange
    const view = viewFor();
    view.version.content.nutritionNotes = 'Protein at every meal';
    view.version.content.lifestyleNotes = 'Lights out by 23:00';

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(screen.getByRole('region', { name: 'Nutrition' })).getByText('Protein at every meal')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Lifestyle' })).getByText('Lights out by 23:00')).toBeInTheDocument();
  });

  it('offers no editing without an editing mode', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
  });

  it('starts the block pages at the second heading level in editing mode, with no cover above them', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} editing={{ write: vi.fn(), reset: vi.fn() }} part="block" />);

    // assert
    expect(screen.queryByRole('heading', { level: 3, name: 'Calendar' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Every session' })).toBeInTheDocument();
  });

  it('splits into the program-wide pages and the block pages', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);

    // act
    const { unmount } = render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Calendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Every session' })).not.toBeInTheDocument();

    // act
    unmount();
    render(<ProgramDocument view={view} part="block" />);

    // assert
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Every session' })).toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: / exercises$/ })).toHaveLength(block.sessions.length);
    expect(screen.queryByRole('complementary', { name: 'How to read your session' })).not.toBeInTheDocument();
  });

  it('turns every text into a slot in editing mode, with empty optional texts as fields', () => {
    // arrange
    const view = viewFor();
    const write = vi.fn();

    // act
    render(<ProgramDocument view={view} editing={{ write, reset: vi.fn() }} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Ana Pop' })).toBeInTheDocument();
    for (const name of ['Focus until the next check-in (optional)', 'Nutrition (optional)', 'Lifestyle (optional)']) {
      expect(screen.getByRole('textbox', { name })).toHaveTextContent(/^$/);
    }
    expect(screen.getAllByRole('textbox', { name: 'A note from Eli (optional)' })).toHaveLength(2);
    for (const name of ['Program title', 'How to read your session', 'Block intro', 'Split text', 'Warm-up', 'How to progress', 'Missed-day note', 'No weight listed', 'Daily steps', 'Low-energy session']) {
      expect(screen.getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument();
    }
  });
});
