import { render, screen, within } from '@testing-library/react';
import { addDays, format } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { seededProgramView } from '../../../test/programFixtures';
import type { Exercise } from '../../context/TrainingContext';
import { BLOCK_TYPE_LABELS, cardioOn, formatRest, positionLabel, sessionOn, WEEKDAYS, type Block, type Row, type Session, type Weekday } from '../../domain/program';
import { SAMPLE_EXERCISES } from '../../services/exerciseSamples';
import { ProgramDocument } from './ProgramDocument';
import { parseTemplate, programTemplate } from './ProgramText';
import type { ProgramView } from './programView';

const DAY_ONE = new Date(2026, 8, 14);
const TODAY = new Date(2026, 8, 22);

function viewFor(seed: 'published' | 'two-versions' = 'published'): ProgramView {
  return seededProgramView({ seed, dayOne: DAY_ONE, today: TODAY, clientName: 'Ana Pop' });
}

function blocksOf(view: ProgramView): Block[] {
  return view.version.content.plan.blocks;
}

function nameOf(view: ProgramView, exerciseId: string): string {
  return view.exercisesById.get(exerciseId)?.name ?? '';
}

function firstSessionWeekday(block: Block): Weekday {
  const weekday = WEEKDAYS.find(candidate => block.calendar[candidate].kind === 'session');
  if (!weekday) throw new Error('no session day');
  return weekday;
}

function firstSession(block: Block): Session {
  const session = sessionOn(block, firstSessionWeekday(block));
  if (!session) throw new Error('session missing');
  return session;
}

function firstCardioWeekday(block: Block): Weekday {
  const weekday = WEEKDAYS.find(candidate => block.calendar[candidate].kind === 'cardio');
  if (!weekday) throw new Error('no cardio day');
  return weekday;
}

/** The block part prints the current block's opener and first week only, which keeps these renders small. */
function renderFirstWeek(view: ProgramView) {
  return render(<ProgramDocument view={view} part="block" />);
}

/** Week headings join their words with no-break spaces so a range never wraps before its dash. */
function rangeName(range: string): RegExp {
  return new RegExp(`^${range.replaceAll(' ', '\\s')}$`);
}

function definitionOf(term: string): HTMLElement {
  const definition = screen.getAllByRole('term').find(candidate => candidate.textContent === term)?.nextElementSibling;
  if (!(definition instanceof HTMLElement)) throw new Error(`${term} missing`);
  return definition;
}

function dateOf(week: number, weekday: Weekday): Date {
  return addDays(DAY_ONE, (week - 1) * 7 + WEEKDAYS.indexOf(weekday));
}

/** A week's page is named by its heading, the dates of its seven days. */
function weekPage(week: number): HTMLElement {
  const start = dateOf(week, 'mon');
  const end = dateOf(week, 'sun');
  const range = start.getMonth() === end.getMonth() ? `${format(start, 'd')}–${format(end, 'd MMMM')}` : `${format(start, 'd MMMM')} – ${format(end, 'd MMMM')}`;
  return screen.getByRole('article', { name: rangeName(range) });
}

/** A day's page is named by its date and then its session. */
function dayPage(week: number, weekday: Weekday): HTMLElement {
  return screen.getByRole('article', { name: new RegExp(`^${format(dateOf(week, weekday), 'EEEE d MMMM')} `) });
}

function dayTable(week: number, weekday: Weekday): HTMLElement {
  return within(dayPage(week, weekday)).getByRole('table', { name: /: sets and your log$/ });
}

function withFirstSession(view: ProgramView, edit: (session: Session) => Session): Session {
  const [block] = blocksOf(view);
  const index = block.sessions.indexOf(firstSession(block));
  block.sessions[index] = edit(block.sessions[index]);
  return block.sessions[index];
}

describe('ProgramDocument cover', () => {
  it("titles the program with the coach's title, else with her first name, under a version eyebrow", () => {
    // arrange
    const view = viewFor();
    view.version.content.header.title = '';

    // act
    const { unmount } = render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: "Ana's training program" })).toBeInTheDocument();
    expect(screen.getByText('Training program · Version 1')).toBeInTheDocument();
    expect(screen.getByText(/^From Coach Eli · published \d{1,2} \w+ 2026$/)).toBeInTheDocument();

    // act
    unmount();
    view.version.content.header.title = 'Your first program';
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getAllByRole('heading', { level: 1 }).map(heading => heading.textContent)).toEqual(['Your first program']);
  });

  it("carries the coach's focus line and note with what changed as its last paragraph, and leaves the plan's facts to the timeline", () => {
    // arrange
    const view = viewFor('two-versions');

    // act
    const { unmount } = render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    expect(screen.getByText(view.version.content.header.focus)).toBeInTheDocument();
    const note = screen.getByText('A note from Eli').closest('figure');
    expect(note).toHaveTextContent(view.version.content.header.personalNote);
    expect(within(note as HTMLElement).getByText('What changed:').parentElement).toHaveTextContent(`What changed: ${view.version.whatChanged}`);
    expect(screen.queryByText(/^What changed in version/)).not.toBeInTheDocument();
    for (const fact of ['Length', 'Dates', 'Blocks', 'Check-in form']) expect(screen.queryByRole('term', { name: fact })).not.toBeInTheDocument();

    // act
    unmount();
    view.version.content.header.personalNote = '';
    render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    const figure = screen.getByText('A note from Eli').closest('figure');
    expect(figure).toHaveTextContent(`A note from EliWhat changed: ${view.version.whatChanged}`);
  });

  it('leaves out every optional text the coach did not write and prints no disclaimer', () => {
    // arrange
    const view = viewFor('two-versions');
    const { content } = view.version;
    view.version.whatChanged = ' ';
    content.header = { ...content.header, focus: '', personalNote: '' };
    content.nutritionNotes = '';
    content.lifestyleNotes = '';

    // act
    const { container } = render(<ProgramDocument view={view} />);

    // assert
    expect(screen.queryByText(/^What changed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nutrition' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lifestyle' })).not.toBeInTheDocument();
    expect(screen.queryByText(/A note from/)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("See your coach's disclaimer.");
  });
});

describe('ProgramDocument at a glance', () => {
  it('draws only the plan, every week dated by its start and linked to its pages, with the check-in weekday in the key', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const glance = screen.getByRole('region', { name: 'Your program at a glance' });
    expect(within(glance).queryByText('Now')).not.toBeInTheDocument();
    expect(within(glance).queryByRole('toolbar')).not.toBeInTheDocument();
    const foundationWeeks = within(within(glance).getByRole('list', { name: 'Foundation weeks' })).getAllByRole('listitem');
    expect(foundationWeeks[0]).toHaveTextContent(/^1\s*14 Sep/);
    expect(foundationWeeks[1]).toHaveTextContent(/^2\s*21 Sep/);
    const week2 = within(glance).getByRole('link', { name: /^Week 2 of 11,/ });
    expect(week2).toHaveAttribute('href', `#${weekPage(2).id}`);
    expect(within(glance).getByText('Check-in form day, every two weeks, on Mondays')).toBeInTheDocument();
  });

  it('gives pages only to the weeks from the one the version is published in, leaving earlier weeks on the plan without a link', () => {
    // arrange
    const view = viewFor();
    view.version.publishedAt = addDays(DAY_ONE, 4 * 7 + 2);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getAllByRole('heading', { level: 3, name: /^\d+(–|\s[A-Z][a-z]+\s–\s)\d+\s[A-Z][a-z]+$/ }).map(heading => heading.textContent?.replaceAll('\u00a0', ' '))).toEqual([
      '12–18 October',
      '19–25 October',
      '26 October – 1 November',
      '2–8 November',
      '9–15 November',
      '16–22 November',
      '23–29 November',
    ]);
    expect(screen.queryByRole('heading', { level: 2, name: 'Foundation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Week 4 of 11,/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Week 5 of 11,/ })).toHaveAttribute('href', '#week-5');
  });
});

describe('ProgramDocument reading guide', () => {
  it('explains only what is not obvious, reps, RIR with what to lift when no weight is listed, the warm-up set and the effort words', () => {
    // arrange
    const view = viewFor('two-versions');

    // act
    render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    const guide = screen.getByRole('region', { name: 'How to read your sessions' });
    const terms = within(guide).getAllByRole('term');
    expect(terms.slice(0, 4).map(term => term.textContent)).toEqual(['Reps 8–10', 'RIR2', expect.stringMatching(/^Warm-up set/), 'Effort']);
    expect(terms[1].nextElementSibling).toHaveTextContent(
      `Reps in reserve: stop each set when you could do about 2 more. RIR 0 means to failure, with good form. ${programTemplate(view, 'noWeight')}`,
    );
    expect(within(terms[3].nextElementSibling as HTMLElement).getByText('Easy')).toBeInTheDocument();
    expect(within(terms[3].nextElementSibling as HTMLElement).getByText('Only a few words at a time.')).toBeInTheDocument();
    expect(guide).not.toHaveTextContent(/Working set|Your log|A, B, C|Pause|by RIR/);
    expect(screen.queryByText('Exercise names')).not.toBeInTheDocument();
    expect(screen.queryByText(/^C1 \/ C2/)).not.toBeInTheDocument();
    expect(screen.getByText('Every session')).toBeInTheDocument();
    expect(screen.getByText('How to progress')).toBeInTheDocument();
    expect(screen.getByText('Low-energy session (20–30 min)')).toBeInTheDocument();
  });
});

describe('ProgramDocument blocks', () => {
  it('opens every block of the program in order with its dates alone, without its week, steps target or cardio', () => {
    // arrange
    const view = viewFor('two-versions');
    const blocks = blocksOf(view);
    const steps = blocks[0].dailySteps.toLocaleString('en-US');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const names = blocks.map(block => BLOCK_TYPE_LABELS[block.type]);
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Your program at a glance', 'How to read your sessions', ...names]);
    const openerOf = (name: string) => screen.getByRole('region', { name });
    const opener = openerOf(names[0]);
    expect(within(opener).getByText('14 Sep–11 Oct')).toBeInTheDocument();
    expect(within(openerOf(names[2])).getByText('23–29 Nov')).toBeInTheDocument();
    expect(opener).not.toHaveTextContent(/Weeks 1–4|steps a day/);
    expect(within(opener).queryByText('Effort')).not.toBeInTheDocument();
    expect(within(opener).queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
    expect(definitionOf('Daily steps')).toHaveTextContent(/^Walking is one of the most underrated tools/);
    expect(definitionOf('Daily steps')).not.toHaveTextContent(steps);
  });

  it("prints the block's coach texts under its intro title as labelled rows, the split's shape leading its text", () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    block.missedDayNote = 'Missed one? Pick up with the next session.';
    const intro = parseTemplate(block.introText || programTemplate(view, `block.${block.type}`)).title;
    const split = parseTemplate(block.split.text).title;

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 3, name: intro })).toBeInTheDocument();
    const [label, shape] = split.split(': ');
    expect(definitionOf(label)).toHaveTextContent(new RegExp(`^${shape}\\. `));
    expect(within(definitionOf(label)).getByText(`${shape}.`).tagName).toBe('STRONG');
    expect(screen.queryByRole('heading', { name: split })).not.toBeInTheDocument();
    expect(definitionOf('How it should feel')).toHaveTextContent(/^Challenging/);
    expect(definitionOf('Missed one?')).toHaveTextContent('Pick up with the next session.');
  });
});

describe('ProgramDocument week overview', () => {
  it('heads each week by its dates and block week, states its daily steps as a figure, and lists its seven days, each training day by name and length only', () => {
    // arrange
    const view = viewFor('two-versions');
    const [foundation, hypertrophy] = blocksOf(view);
    const session = firstSession(foundation);
    const steps = foundation.dailySteps.toLocaleString('en-US');

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const week = weekPage(1);
    expect(within(week).getByRole('heading', { level: 3, name: rangeName('14–20 September') })).toBeInTheDocument();
    expect(within(within(week).getByRole('banner')).getByText('Foundation · week 1 of 4')).toBeInTheDocument();
    expect(within(week).getByText('Daily steps').nextElementSibling).toHaveTextContent(`${steps}every day`);
    expect(within(week).getByRole('banner')).not.toHaveTextContent('steps');
    expect(week).not.toHaveTextContent(/Week 1 of 11|Effort|Done/);
    const days = within(within(week).getByRole('list', { name: 'Days of the week' })).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    const sessionDay = days[WEEKDAYS.indexOf(firstSessionWeekday(foundation))];
    expect(within(sessionDay).getByRole('link', { name: new RegExp(`^Monday 14 September, ${session.name}, `) })).toBeInTheDocument();
    expect(sessionDay).toHaveTextContent(/~\d+ min/);
    expect(within(sessionDay).queryByRole('table')).not.toBeInTheDocument();
    expect(sessionDay).not.toHaveTextContent(nameOf(view, session.rows[0].exerciseId));
    expect(within(week).getAllByText('Rest')).toHaveLength(WEEKDAYS.filter(weekday => foundation.calendar[weekday].kind === 'rest').length);
    expect(within(weekPage(5)).getByText(`Hypertrophy · week 1 of ${hypertrophy.weeks}`)).toBeInTheDocument();
    expect(within(weekPage(11)).getByText('Deload week')).toBeInTheDocument();
  });

  it('links every training day of the week to its own page', () => {
    // arrange
    const view = viewFor('two-versions');
    const [block] = blocksOf(view);
    const weekday = firstCardioWeekday(block);
    const cardio = cardioOn(block, weekday);

    // act
    renderFirstWeek(view);

    // assert
    const linksTo = (name = '') => within(weekPage(1)).getAllByRole('link', { name: new RegExp(`\\b${name}\\b`) }).map(link => link.getAttribute('href'));
    expect(linksTo(cardio?.name)).toContain(`#${dayPage(1, weekday).id}`);
    expect(linksTo(firstSession(block).name)).toContain(`#${dayPage(1, firstSessionWeekday(block)).id}`);
    expect(within(weekPage(1)).queryByRole('link', { name: /Rest/ })).not.toBeInTheDocument();
  });

  it('asks for the check-in form once, under the heading of its day, with the log pages of the two weeks before', () => {
    // arrange
    const view = viewFor();

    // act
    render(<ProgramDocument view={view} />);

    // assert
    const checkInDay = dayPage(3, firstSessionWeekday(blocksOf(view)[0]));
    expect(within(checkInDay).getByText('Check-in form day.').parentElement).toHaveTextContent('Check-in form day. Send your form with photos of your log pages from weeks 1 and 2.');
    expect(within(weekPage(3)).queryByText('Check-in form day.')).not.toBeInTheDocument();
    expect(within(weekPage(4)).queryByText('Check-in form day.')).not.toBeInTheDocument();
  });

  it('asks for the check-in form on the week overview when the check-in day has no page of its own', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    block.calendar = { ...block.calendar, [firstSessionWeekday(block)]: { kind: 'rest' } };

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(weekPage(3)).getByText('Check-in form day.').parentElement).toHaveTextContent('Check-in form day. Send your form with photos of your log pages from weeks 1 and 2.');
  });

  it('prints the calibration text on the week overview of a calibration week and logs that week as finding her weights', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    block.calibrationWeek = true;
    const weekday = firstSessionWeekday(block);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(weekPage(1)).getByRole('term')).toHaveTextContent('Week 1 — finding your weights');
    expect(within(weekPage(2)).queryByText('Week 1 — finding your weights')).not.toBeInTheDocument();
    expect(within(dayTable(1, weekday)).getByRole('columnheader', { name: 'Your log · finding your weights' })).toBeInTheDocument();
    expect(within(dayTable(2, weekday)).getByRole('columnheader', { name: 'Your log · weight × reps' })).toBeInTheDocument();
  });

  it('reads a block that is not written yet as sessions to come, with no day pages', () => {
    // arrange
    const view = viewFor();
    const deload = blocksOf(view)[2];
    deload.sessions = deload.sessions.map(session => ({ ...session, rows: [] }));

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(weekPage(11)).getAllByText('Sessions to come')).toHaveLength(7);
    expect(within(weekPage(11)).queryByRole('link', { name: /Sessions to come/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: /: sets and your log$/ })).toHaveLength(blocksOf(view).slice(0, 2).reduce((total, block) => total + block.weeks * 3, 0));
  });
});

describe('ProgramDocument strength days', () => {
  it('gives every strength day of every week its own dated page, a one-week block included', () => {
    // arrange
    const view = viewFor();
    const blocks = blocksOf(view);
    const days = blocks.reduce((total, block) => total + block.weeks * WEEKDAYS.filter(weekday => block.calendar[weekday].kind === 'session').length, 0);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getAllByRole('table', { name: /: sets and your log$/ })).toHaveLength(days);
    const weekday = firstSessionWeekday(blocks[2]);
    expect(within(dayPage(11, weekday)).getByRole('heading', { level: 4, name: firstSession(blocks[2]).name })).toBeInTheDocument();
    expect(within(dayPage(11, weekday)).getByRole('table', { name: /: sets and your log$/ })).toBeInTheDocument();
  });

  it('logs every set, warm-up sets included, in one column under the log head', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    const session = firstSession(block);
    const rows = session.rows.filter(row => row.exerciseId !== '');
    const [main] = rows;
    const sets = rows.reduce((total, row) => total + row.sets.length, 0);
    const supersets = new Set(rows.filter(row => positionLabel(session, row) !== row.slot).map(row => row.supersetGroup)).size;

    // act
    renderFirstWeek(view);

    // assert
    const table = dayTable(1, firstSessionWeekday(block));
    expect(within(table).getAllByRole('columnheader').map(head => head.textContent)).toEqual(['Set', 'Reps', 'RIR', 'Your log · weight × reps']);
    const [, ...body] = within(table).getAllByRole('row');
    expect(body).toHaveLength(sets + rows.length + supersets);
    expect(within(table).getByRole('rowheader', { name: `${nameOf(view, main.exerciseId)}, Warm-up set 1` })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: `${nameOf(view, main.exerciseId)}, Set 1` })).toBeInTheDocument();
  });

  it('heads a day page with its date and session alone, leaving week, block and length to the week overview', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    const weekday = firstSessionWeekday(block);

    // act
    renderFirstWeek(view);

    // assert
    const head = within(dayPage(1, weekday)).getByRole('banner');
    expect(within(head).getByRole('heading', { level: 4 })).toHaveTextContent(firstSession(block).name);
    expect(within(head).getByText('Monday 14 September')).toBeInTheDocument();
    expect(head).not.toHaveTextContent(/Week 1|Foundation|min|Last week/);
  });

  it('sends a phone from a repeated week to the same day of the first week of its block', () => {
    // arrange
    const view = viewFor();
    const weekday = firstSessionWeekday(blocksOf(view)[0]);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(dayPage(1, weekday)).queryByText(/^Same sets as/)).not.toBeInTheDocument();
    const link = within(dayPage(3, weekday)).getByRole('link', { name: 'Monday 14 September' });
    expect(link).toHaveAttribute('href', `#${dayPage(1, weekday).id}`);
  });

  it('names the exercise, its rest and every swap as a link on its note line, with no swaps section', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    const session = firstSession(block);
    const row = session.rows.find(candidate => candidate.substitutions.length > 1 && positionLabel(session, candidate) === candidate.slot);
    if (!row) throw new Error('row with swaps missing');

    // act
    renderFirstWeek(view);

    // assert
    const header = within(dayTable(1, firstSessionWeekday(block))).getByRole('rowheader', { name: new RegExp(`^${row.slot} ${nameOf(view, row.exerciseId)}`) });
    expect(header).toHaveTextContent(new RegExp(`Rest ${formatRest(row.restSeconds)} · Swaps: `));
    for (const id of row.substitutions) {
      expect(within(header).getByRole('link', { name: nameOf(view, id) })).toHaveAttribute('href', `${window.location.origin}/portal/exercises/${id}`);
    }
    expect(screen.queryByRole('heading', { name: 'Swaps' })).not.toBeInTheDocument();
  });

  it('prints a superset rest once, on its eyebrow line, and leaves it off the exercises', () => {
    // arrange
    const view = viewFor();
    const session = withFirstSession(view, original => ({
      ...original,
      rows: original.rows.slice(0, 2).map((row, index): Row => ({ ...row, slot: 'C', supersetGroup: 'g', restSeconds: index === 0 ? 120 : 90 })),
    }));

    // act
    renderFirstWeek(view);

    // assert
    const table = dayTable(1, firstSessionWeekday(blocksOf(view)[0]));
    expect(within(table).getByText('Superset')).toBeInTheDocument();
    expect(within(table).getByText('Rest 1:30').parentElement).toHaveTextContent('Alternate C1 and C2. Rest 1:30 after C2.');
    const names = session.rows.map(row => nameOf(view, row.exerciseId));
    for (const name of names) expect(within(table).getByRole('rowheader', { name: new RegExp(`^C\\d ${name}`) })).not.toHaveTextContent(/Rest/);
  });

  it('shows a weight column only when a set prescribes one, with warm-up sets lighter and an empty weight where none is suggested', () => {
    // arrange
    const view = viewFor();
    const warmUp = { kind: 'warm-up' as const, reps: { min: 10, max: 10 } };
    const top = { kind: 'working' as const, reps: { min: 5, max: 5 }, rir: { min: 2, max: 2 }, weightKg: 60 };
    const steady = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };
    withFirstSession(view, original => ({ ...original, rows: [{ ...original.rows[0], sets: [warmUp, top, steady] }] }));

    // act
    renderFirstWeek(view);

    // assert
    const table = dayTable(1, firstSessionWeekday(blocksOf(view)[0]));
    expect(within(table).getAllByRole('columnheader').map(head => head.textContent)).toContain('Weight');
    const [, , ...sets] = within(table).getAllByRole('row');
    expect(sets.map(set => within(set).getAllByRole('cell').map(cell => cell.textContent))).toEqual([
      ['10warm-up', '–none', 'lighter'],
      ['5', '2', '60 kg'],
      ['8–10', '1–2', ''],
    ]);
  });

  it("prints a per-side or timed exercise's unit after the reps of every set rather than on its note line", () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);
    const session = firstSession(block);
    const perSide = session.rows.find(row => view.exercisesById.get(row.exerciseId)?.perSide && view.exercisesById.get(row.exerciseId)?.measuredIn !== 'time');
    const timed = session.rows.find(row => view.exercisesById.get(row.exerciseId)?.measuredIn === 'time');
    if (!perSide || !timed) throw new Error('per-side or timed row missing');

    // act
    renderFirstWeek(view);

    // assert
    const table = dayTable(1, firstSessionWeekday(block));
    expect(within(table).getByRole('rowheader', { name: new RegExp(`^${positionLabel(session, perSide)} ${nameOf(view, perSide.exerciseId)}`) })).not.toHaveTextContent(/per side/i);
    const perSideSets = within(table).getAllByRole('rowheader', { name: new RegExp(`^${nameOf(view, perSide.exerciseId)}, Set`) });
    expect(perSideSets.map(set => set.nextElementSibling?.textContent)).toEqual(perSide.sets.map(set => `${set.reps.min}–${set.reps.max}per side`));
    const timedSets = within(table).getAllByRole('rowheader', { name: new RegExp(`^${nameOf(view, timed.exerciseId)}, Set`) });
    expect(timedSets[0].nextElementSibling).toHaveTextContent(/^\d+(–\d+)?s/);
  });

  it('bands the warm-up and, when it is on, the cool-down, each exercise linked with its amount', () => {
    // arrange
    const view = viewFor();
    const [stretch] = SAMPLE_EXERCISES;
    const session = withFirstSession(view, original => ({ ...original, coolDown: { enabled: true, items: [{ id: 'cd-1', exerciseId: stretch.id, seconds: 30 }] } }));
    const [warmUp] = session.warmUp.items;

    // act
    renderFirstWeek(view);

    // assert
    const page = dayPage(1, firstSessionWeekday(blocksOf(view)[0]));
    const warmUpBand = within(page).getByRole('heading', { level: 5, name: 'Warm-up' }).closest('section');
    const coolDownBand = within(page).getByRole('heading', { level: 5, name: 'Cool-down' }).closest('section');
    if (!warmUpBand || !coolDownBand) throw new Error('bands missing');
    expect(within(warmUpBand).getByRole('link', { name: nameOf(view, warmUp.exerciseId) })).toBeInTheDocument();
    expect(within(coolDownBand).getByRole('listitem')).toHaveTextContent(new RegExp(`^${stretch.name}30`));
  });

  it('prints the cues the coach wrote for her and a custom progression under the exercise, never the library description', () => {
    // arrange
    const view = viewFor();
    withFirstSession(view, original => ({
      ...original,
      rows: [
        { ...original.rows[0], cues: 'Brace first', touched: ['cues' as const], progression: { kind: 'custom' as const, text: 'Add 2 kg weekly' } },
        { ...original.rows[1], cues: 'Library description', touched: [] },
      ],
    }));

    // act
    renderFirstWeek(view);

    // assert
    const table = dayTable(1, firstSessionWeekday(blocksOf(view)[0]));
    expect(table).toHaveTextContent('Brace first');
    expect(table).toHaveTextContent('Add 2 kg weekly');
    expect(table).not.toHaveTextContent('Library description');
  });

  it('still names an archived exercise and flags a removed one', () => {
    // arrange
    const view = viewFor();
    const [first, second] = firstSession(blocksOf(view)[0]).rows;
    const archived: Exercise = { ...(view.exercisesById.get(first.exerciseId) as Exercise), archivedAt: '2026-09-01T00:00:00.000Z' };
    const exercisesById = new Map(view.exercisesById);
    exercisesById.set(archived.id, archived);
    withFirstSession(view, original => ({ ...original, rows: [first, { ...second, exerciseId: 'gone' }] }));

    // act
    renderFirstWeek({ ...view, exercisesById });

    // assert
    expect(screen.getAllByRole('rowheader', { name: new RegExp(`^${first.slot} ${archived.name}`) }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exercise removed').length).toBeGreaterThan(0);
  });
});

describe('ProgramDocument cardio days', () => {
  it('follows the week overview with one page per training day, strength and cardio, in date order', () => {
    // arrange
    const view = viewFor('two-versions');
    const [block] = blocksOf(view);
    const training = WEEKDAYS.filter(weekday => block.calendar[weekday].kind !== 'rest');

    // act
    renderFirstWeek(view);

    // assert
    const pages = [weekPage(1), ...training.map(weekday => dayPage(1, weekday))];
    pages.slice(1).forEach((page, index) => expect(pages[index].compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
  });

  it('gives a cardio day its segments, linking an exercise once, and a log of a Done tick, the minutes done and how it felt', () => {
    // arrange
    const view = viewFor('two-versions');
    const [block] = blocksOf(view);
    const weekday = WEEKDAYS.find(candidate => cardioOn(block, candidate)?.segments.some(segment => segment.kind === 'rounds'));
    const intervals = weekday && cardioOn(block, weekday);
    if (!weekday || !intervals) throw new Error('intervals missing');
    const [first] = intervals.segments;
    if (first.kind !== 'steady') throw new Error('steady segment missing');

    // act
    renderFirstWeek(view);

    // assert
    const page = dayPage(1, weekday);
    expect(within(page).getByRole('heading', { level: 4 })).toHaveTextContent(intervals.name);
    expect(within(page).getAllByRole('heading', { level: 5 })).toHaveLength(intervals.segments.length);
    expect(within(page).getAllByRole('link', { name: nameOf(view, first.exerciseId) })).toHaveLength(1);
    expect(within(page).getByRole('table', { name: /^Segment 2, Intervals/ })).toHaveTextContent('8 rounds');
    expect(within(page).getByText('Done')).toBeInTheDocument();
    for (const label of ['Minutes done', 'How did it feel?']) expect(within(page).getByText(label)).toBeInTheDocument();
    expect(within(page).getByRole('banner')).not.toHaveTextContent(/min/);
  });

  it("prints a repeated week's cardio in full, with no pointer back to the first week", () => {
    // arrange
    const view = viewFor('two-versions');
    const weekday = firstCardioWeekday(blocksOf(view)[0]);

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(within(dayPage(2, weekday)).getAllByRole('table', { name: /^Segment / })).toHaveLength(cardioOn(blocksOf(view)[0], weekday)?.segments.length ?? 0);
    expect(within(dayPage(2, weekday)).queryByText(/^Same sets as/)).not.toBeInTheDocument();
  });
});

describe('ProgramDocument running header', () => {
  it("names the client in the printed page's running header without any of her name escaping the header's style", () => {
    // arrange
    const view = { ...viewFor(), clientName: 'Ana </style><script>alert(1)</script> "Pop" \\ \n' };

    // act
    const markup = renderToStaticMarkup(<ProgramDocument view={view} part="program-wide" />);

    // assert
    const style = /<style>(.*?)<\/style>/s.exec(markup)?.[1] ?? '';
    expect(markup.match(/<\/style>/g)).toHaveLength(1);
    expect(markup).not.toContain('<script>');
    expect(style).toContain('content: "Ana \\3c \\2f style\\3e \\3c script\\3e alert\\28 1\\29 \\3c \\2f script\\3e  \\22 Pop\\22  \\5c  \\a ";');
    expect(style).not.toMatch(/[<>\n]/);
  });
});

describe('ProgramDocument closing and editing', () => {
  it('closes with the written nutrition and lifestyle guidance', () => {
    // arrange
    const view = viewFor();
    view.version.content.nutritionNotes = 'Protein at every meal';
    view.version.content.lifestyleNotes = 'Lights out by 23:00';

    // act
    render(<ProgramDocument view={view} />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Nutrition' }).nextElementSibling).toHaveTextContent('Protein at every meal');
    expect(screen.getByRole('heading', { level: 2, name: 'Lifestyle' }).nextElementSibling).toHaveTextContent('Lights out by 23:00');
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

  it('splits into the program-wide pages and the chapter of the current block', () => {
    // arrange
    const view = viewFor();
    const [block] = blocksOf(view);

    // act
    const { unmount } = render(<ProgramDocument view={view} part="program-wide" />);

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'How to read your sessions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: BLOCK_TYPE_LABELS[block.type] })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /: sets and your log$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Week 1 of 11,/ })).not.toBeInTheDocument();

    // act
    unmount();
    render(<ProgramDocument view={view} part="block" />);

    // assert
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'How to read your sessions' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([BLOCK_TYPE_LABELS[block.type]]);
    expect(screen.getByRole('heading', { level: 3, name: rangeName('14–20 September') })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: rangeName('21–27 September') })).not.toBeInTheDocument();
    expect(screen.getAllByRole('table', { name: /: sets and your log$/ })).toHaveLength(WEEKDAYS.filter(weekday => block.calendar[weekday].kind === 'session').length);
  });

  it('gives every text a slot in editing mode, the program-wide ones under the cover and the block ones in its chapter', () => {
    // arrange
    const view = viewFor();
    const editing = { write: vi.fn(), reset: vi.fn() };

    // act
    const { unmount } = render(<ProgramDocument view={view} editing={editing} part="program-wide" />);

    // assert
    expect(screen.getByRole('textbox', { name: 'Program title (optional)' })).toHaveAttribute('aria-placeholder', "Ana's training program");
    for (const name of ['Focus until the next check-in (optional)', 'Nutrition (optional)', 'Lifestyle (optional)', 'A note from Eli (optional)']) {
      expect(screen.getByRole('textbox', { name })).toHaveTextContent(/^$/);
    }
    for (const name of ['How to read your session', 'No weight listed', 'Warm-up', 'How to progress', 'Low-energy session']) {
      expect(screen.getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument();
    }

    // act
    unmount();
    blocksOf(view)[0].calibrationWeek = true;
    render(<ProgramDocument view={view} editing={editing} part="block" />);

    // assert
    for (const name of ['Block intro', 'Split text', 'Missed-day note', 'Daily steps']) {
      expect(screen.getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox', { name: 'A note from Eli (optional)' })).toBeInTheDocument();
    expect(within(weekPage(1)).getByRole('button', { name: 'Edit Calibration week' })).toBeInTheDocument();
    expect(screen.getByText('Weeks 2–4 print the same pages with their own dates.')).toBeInTheDocument();
  });
});
