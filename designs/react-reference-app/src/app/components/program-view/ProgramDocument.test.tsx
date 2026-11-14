import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { currentBlockOf } from '../../../test/programFixtures';
import { BLOCK_TYPE_LABELS, currentVersion, warmUpItemText, WEEKDAYS, type Weekday } from '../../domain/program';
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
    expect(screen.getByText('Missed one? Pick up with the next session.')).toBeInTheDocument();
  });

  it('gives the current block and week, next check-in and daily steps on the cover', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const facts = within(screen.getByRole('banner')).getByText('Now').closest('dl');
    expect(facts).toHaveTextContent(`Now${BLOCK_TYPE_LABELS[block.type]} · week 1 of ${block.weeks}`);
    expect(facts).toHaveTextContent(/Next check-in form\w+day, \d{1,2} \w+Daily steps/);
    expect(facts).toHaveTextContent(`Daily steps${block.dailySteps.toLocaleString('en-US')}`);
    expect(screen.queryByRole('region', { name: 'At a glance' })).not.toBeInTheDocument();
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
    const calendar = screen.getByRole('table', { name: `Your ${block.weeks} weeks` });
    const [, ...weeks] = within(calendar).getAllByRole('row');
    expect(weeks).toHaveLength(block.weeks);
    expect(within(calendar).getAllByRole('columnheader').map(header => header.textContent)).toEqual(order.map(day => day[0].toUpperCase() + day.slice(1)));
    expect(within(weeks[0]).getByRole('rowheader')).toHaveTextContent('Week 1 16–22 Sep');
    for (const week of weeks) expect(within(week).getAllByRole('cell')).toHaveLength(7);
    expect(within(weeks[0]).getAllByRole('cell')[0].querySelector('time')).toHaveAttribute('datetime', '2026-09-16');
  });

  it('puts a tick box on every training and cardio day and none on a rest day', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const order: Weekday[] = ['wed', 'thu', 'fri', 'sat', 'sun', 'mon', 'tue'];
    const restDays = order.filter(day => block.calendar[day].kind === 'rest').length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: `Your ${block.weeks} weeks` });
    const [, ...weeks] = within(calendar).getAllByRole('row');
    for (const week of weeks) {
      const cells = within(week).getAllByRole('cell');
      cells.forEach((cell, index) => {
        const rests = block.calendar[order[index]].kind === 'rest';
        expect(cell).toHaveTextContent(rests ? /Rest$/ : /\S/);
        expect(within(cell).queryAllByRole('img', { name: 'Tick box' })).toHaveLength(rests ? 0 : 1);
      });
    }
    expect(within(calendar).getAllByRole('img', { name: 'Tick box' })).toHaveLength(block.weeks * (7 - restDays));
  });

  it('marks the check-in form days that fall inside the block', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: `Your ${block.weeks} weeks` });
    const checkIns = within(calendar).getAllByRole('cell').filter(cell => cell.textContent?.includes('check-in form due'));
    expect(checkIns.map(cell => cell.querySelector('time')?.getAttribute('datetime'))).toEqual(['2026-10-05']);
    expect(screen.getByText('Send your check-in form that day')).toBeInTheDocument();
  });

  it('lays the block out from Monday without dates or check-ins before the plan has a first day', () => {
    // arrange
    const view = viewFor('published', null);
    const block = currentBlockOf(view);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const calendar = screen.getByRole('table', { name: `Your ${block.weeks} weeks` });
    expect(within(calendar).getAllByRole('columnheader')[0]).toHaveTextContent('Mon');
    expect(calendar.querySelector('time')).toBeNull();
    expect(screen.queryByText('Send your check-in form that day')).not.toBeInTheDocument();
  });

  it('prints each exercise once, headed by its letter, with a row per set and a log column per week', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);
    const [session] = block.sessions;
    const [row] = session.rows;
    const name = view.exercisesById.get(row.exerciseId)?.name ?? '';
    const setCount = session.rows.reduce((total, candidate) => total + candidate.sets.length, 0);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const table = screen.getByRole('table', { name: `${session.name} exercises` });
    const [, , ...body] = within(table).getAllByRole('row');
    expect(body).toHaveLength(setCount + session.rows.length);
    expect(within(table).getAllByRole('rowheader', { name: new RegExp(`^${row.slot} ${name}`) })).toHaveLength(1);
    const headers = within(table).getAllByRole('columnheader').map(header => header.textContent);
    expect(headers).toEqual(['Write kg × reps', 'Set', 'Reps', 'RIR', ...Array.from({ length: block.weeks }, (_, index) => `Week ${index + 1}`)]);
    expect(table).not.toHaveTextContent('—');
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

  it('lists the plan, a log table per session and the low-energy session', () => {
    // arrange
    const view = viewFor();
    const sessionCount = currentBlockOf(view).sessions.length;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Your plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Low-energy session' })).toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: / exercises$/ })).toHaveLength(sessionCount);
    expect(screen.getByRole('contentinfo')).toHaveTextContent("Your coach's full disclaimer accompanies this program.");
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
    expect(screen.getByRole('heading', { level: 2, name: `Your ${block.weeks} weeks` })).toBeInTheDocument();
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
    expect(within(card).getByRole('heading', { level: 4, name: 'Warm-up' })).toBeInTheDocument();
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
    expect(within(card).getByRole('heading', { level: 4, name: 'Cool-down' })).toBeInTheDocument();
    expect(within(card).getByText('Walk easy for five minutes.')).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem').map(item => item.textContent)).toContain(`${stretch.name} · 30 s`);
  });

  it('prints an intervals segment as its rounds, its exercises and the non-zero easy and rest times', () => {
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
    expect(within(card).getByText(`Intervals · ${rounds.rounds} rounds`)).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem').map(entry => entry.textContent)).toContain(`${view.exercisesById.get(item.exerciseId)?.name} · ${item.workSeconds} s`);
    expect(within(card).getByText(`${rounds.easySeconds} s easy between exercises`)).toBeInTheDocument();
    expect(within(card).queryByText(/between rounds/)).not.toBeInTheDocument();
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

  it('splits into the program-wide pages and the block pages', () => {
    // arrange
    const view = viewFor();
    const block = currentBlockOf(view);

    // act
    const { unmount } = render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your sessions' })).not.toBeInTheDocument();

    // act
    unmount();
    render(<ProgramDocument view={view} part="block" />);

    // assert
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your sessions' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^Block 1 of \\d+ · ${block.weeks} weeks$`))).toBeInTheDocument();
  });

  it('turns every text into a slot in editing mode, with empty optional texts as fields', () => {
    // arrange
    const view = viewFor();
    const write = vi.fn();

    // act
    render(<ProgramDocument view={view} editing={{ write, reset: vi.fn() }} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Ana Pop' })).toBeInTheDocument();
    for (const name of ['Focus until the next check-in', 'Personal note', 'Note for this block', 'Nutrition', 'Lifestyle']) {
      expect(screen.getByRole('textbox', { name })).toHaveTextContent(/^$/);
    }
    for (const name of ['Program title', 'How to read your session', 'Block intro', 'Split text', 'Warm-up', 'How to progress', 'Missed-day note', 'No weight listed', 'Daily steps', 'Low-energy session']) {
      expect(screen.getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument();
    }
  });
});
