import { fireEvent, screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';

type User = ReturnType<typeof userEvent.setup>;


function setStats(container: HTMLElement): string[] {
  const terms = within(container).getAllByRole('term');
  const values = within(container).getAllByRole('definition');
  return terms.map((term, index) => `${term.textContent} ${values[index].textContent}`);
}

beforeEach(stubEditorBrowserApis);

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, 'elementFromPoint');
  Reflect.deleteProperty(document, 'elementsFromPoint');
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

async function openFirstBlock() {
  const user = renderProgramEditor('&pseed=draft&jstage=approved');
  await user.click(within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation\b/ }));
  return user;
}

function week(): HTMLElement {
  return screen.getByRole('region', { name: 'Week' });
}

function day(name: string): HTMLElement {
  return within(week()).getByRole('heading', { name }).closest('li') as HTMLElement;
}

function session(name: string): HTMLElement {
  return screen.getByRole('article', { name });
}

function slotGroup(name: string): HTMLElement {
  return within(session('Full Body A')).getByRole('heading', { name }).closest('section') as HTMLElement;
}

function card(name: RegExp): HTMLElement {
  return within(session('Full Body A')).getByRole('article', { name });
}

function positions(): string[] {
  return within(session('Full Body A'))
    .getAllByRole('heading', { level: 5 })
    .map(heading => (heading.textContent ?? '').split(' ')[0]);
}

function library(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Exercise library' });
}

async function chooseInDayMenu(user: User, weekday: string, item: string) {
  await user.click(within(week()).getByRole('button', { name: `${weekday} options` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

async function clearFirstSession(user: User) {
  await user.click(within(session('Full Body A')).getByRole('button', { name: 'Full Body A actions' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Clear session' }));
  await user.click(within(screen.getByRole('alertdialog', { name: 'Clear Full Body A?' })).getByRole('button', { name: 'Clear session' }));
}

const LIBRARY_COUNT_ANNOUNCEMENT = /^(\d+ exercises?|No exercises match)$/;

async function showAllEquipment(user: User) {
  await user.click(within(library()).getByRole('button', { name: /^Filters/ }));
  const equipmentFilter = within(screen.getByRole('dialog', { name: 'Filters' })).getByRole('switch', { name: 'Only her equipment' });
  const narrowed = equipmentFilter.getAttribute('aria-checked') === 'true';
  if (narrowed) await user.click(equipmentFilter);
  await user.keyboard('{Escape}');
  if (narrowed) await screen.findByText(LIBRARY_COUNT_ANNOUNCEMENT, {}, { timeout: 3000 });
}

async function addFromLibrary(user: User, name: string) {
  await showAllEquipment(user);
  await user.click(within(library()).getByRole('button', { name: `Add ${name}` }));
}

async function openSubstitutionPickerWithOneHeld() {
  const user = await openFirstBlock();
  const main = card(/^A /);
  const [mainName] = within(main).getAllByRole('heading', { level: 5 }).map(heading => within(heading).getByRole('button').textContent ?? '');
  await user.click(within(main).getByRole('button', { name: /^Details for / }));
  const substitutions = within(main).getByRole('group', { name: 'Substitutions' });
  const [held, removed] = within(substitutions)
    .getAllByRole('button', { name: /^Remove / })
    .map(button => (button.getAttribute('aria-label') ?? '').replace(/^Remove /, ''));
  await user.click(within(substitutions).getByRole('button', { name: `Remove ${removed}` }));
  await user.click(within(substitutions).getByRole('button', { name: `Add substitution for ${mainName}` }));
  await showAllEquipment(user);
  return { user, substitutions, mainName, held };
}

function pointAt(element: HTMLElement) {
  Object.assign(document, { elementFromPoint: () => element, elementsFromPoint: () => [element] });
}

function weekField(container: HTMLElement, name: string): HTMLElement {
  return within(container).getByRole('textbox', { name });
}

function weekToggle(container: HTMLElement, week: number): HTMLElement {
  return within(container).getByRole('button', { name: new RegExp(`^Week ${week}\\b`) });
}

function weekItems(container: HTMLElement, week: number): string[] {
  const row = weekToggle(container, week).closest('li') as HTMLElement;
  const terms = within(row).getAllByRole('term', { hidden: true });
  const values = within(row).getAllByRole('definition', { hidden: true });
  return terms.map((term, index) => `${term.textContent} ${values[index].textContent}`);
}

async function openWeeks(user: User, container: HTMLElement, weeks: readonly number[]) {
  for (const week of weeks) await user.click(weekToggle(container, week));
}

async function retype(user: User, field: HTMLElement, text: string) {
  await user.clear(field);
  await user.type(field, text);
}

describe('BlockWorkspace', () => {
  it('turns a rest day into a cardio session and rests it again', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(day('Saturday')).getByText('Rest')).toBeInTheDocument();

    // act
    await chooseInDayMenu(user, 'Saturday', 'Cardio');

    // assert
    expect(within(day('Saturday')).getByRole('button', { name: 'Cardio' })).toBeInTheDocument();
    expect(session('Cardio')).toBeInTheDocument();

    // act
    await chooseInDayMenu(user, 'Saturday', 'Rest');

    // assert
    expect(within(day('Saturday')).getByText('Rest')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Cardio' })).not.toBeInTheDocument();
  });

  it('shows the estimated length of every training day under its chip', async () => {
    // arrange
    const user = await openFirstBlock();
    const estimate = /~(\d+) of \d+ min/.exec(session('Full Body A').textContent ?? '')?.[1];
    expect(within(day('Monday')).getByText(`~${estimate} min`)).toBeInTheDocument();
    expect(within(day('Saturday')).queryByText(/min$/)).not.toBeInTheDocument();

    // act
    await clearFirstSession(user);

    // assert
    const cleared = /(~\d+|0) of \d+ min/.exec(session('Full Body A').textContent ?? '')?.[1];
    expect(within(day('Monday')).getByText(`${cleared} min`)).toBeInTheDocument();
  });

  it('gives a screen reader the estimated length of a training day', async () => {
    // arrange, act
    await openFirstBlock();

    // assert
    const estimate = /~(\d+) of \d+ min/.exec(session('Full Body A').textContent ?? '')?.[1];
    const spoken = within(day('Monday')).getByText(`about ${estimate} min`);
    expect(spoken.closest("[aria-hidden='true']")).toBeNull();
  });

  it('heads every day card with its weekday and options menu and opens nothing from a rest day', async () => {
    // arrange
    await openFirstBlock();

    // act
    const saturday = day('Saturday');

    // assert
    expect(within(day('Monday')).getAllByRole('button')).toHaveLength(2);
    expect(within(day('Monday')).getByRole('button', { name: 'Monday options' })).toBeInTheDocument();
    expect(within(day('Monday')).getByRole('button', { name: /^Full Body A\s+about \d+ min$/ })).toBeInTheDocument();
    expect(within(day('Monday')).getByText(/^~\d+ min$/)).toBeInTheDocument();
    expect(within(saturday).getByText('Rest')).toBeInTheDocument();
    expect(within(saturday).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['Saturday options']);
    expect(within(saturday).queryByText(/min$/)).not.toBeInTheDocument();
  });

  it('places a session on another weekday from the day menu', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(within(week()).getByRole('button', { name: 'Saturday options' }));
    (await screen.findByRole('menuitem', { name: 'Session' })).focus();
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByRole('menuitem', { name: 'Full Body A' })).toHaveFocus();

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(within(day('Saturday')).getByRole('button', { name: /^Full Body A\s+about \d+ min$/ })).toBeInTheDocument();
    expect(within(day('Monday')).getByText('Rest')).toBeInTheDocument();
  });

  it('expands a session from its day card', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(session('Full Body B')).queryByRole('heading', { name: 'A · Main lift' })).not.toBeInTheDocument();

    // act
    await user.click(within(day('Wednesday')).getByRole('button', { name: /^Full Body B\s+about \d+ min$/ }));

    // assert
    expect(within(session('Full Body B')).getByRole('heading', { name: 'A · Main lift' })).toBeInTheDocument();
    expect(within(session('Full Body A')).queryByRole('heading', { name: 'A · Main lift' })).not.toBeInTheDocument();
  });

  it('quick-adds from the library into the slot whose Add opened it', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    await user.click(within(slotGroup('B · Secondary')).getByRole('button', { name: 'Add or drop an exercise in B · Secondary' }));
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveAccessibleDescription('Adding to Full Body A · B Secondary');
    expect(within(library()).queryByRole('button', { name: 'Stop adding' })).not.toBeInTheDocument();
    expect(within(library()).getByRole('button', { name: 'Filters, 1 active' })).toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Romanian Deadlift');

    // assert
    expect(within(slotGroup('B · Secondary')).getByRole('article', { name: 'B Romanian Deadlift' })).toBeInTheDocument();
    expect(within(slotGroup('A · Main lift')).getByText('Add or drop an exercise')).toBeInTheDocument();
    expect(await screen.findByText('Romanian Deadlift added to Full Body A · B Secondary')).toBeInTheDocument();
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveAccessibleDescription('Adding to Full Body A · B Secondary');
  });

  it('drags a library exercise into an empty group', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    await showAllEquipment(user);
    const source = within(library()).getByRole('button', { name: 'Add Lateral Raises' }).closest('li')?.firstElementChild as HTMLElement;
    const target = within(slotGroup('C · Accessories')).getByText('Add or drop an exercise').parentElement as HTMLElement;
    pointAt(target);

    // act
    fireEvent.mouseDown(source, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document.body, { clientX: 40, clientY: 40 });
    fireEvent.mouseMove(document.body, { clientX: 60, clientY: 60 });
    fireEvent.mouseUp(document.body, { clientX: 60, clientY: 60 });

    // assert
    expect(within(slotGroup('C · Accessories')).getByRole('article', { name: 'C Lateral Raises' })).toBeInTheDocument();
  });

  it('forms a superset of two accessories through the menu', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    for (const name of ['Overhead Press', 'Dumbbell Rows']) {
      await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: /^Add (exercise to|or drop an exercise in) C · Accessories$/ }));
      await addFromLibrary(user, name);
    }
    expect(positions()).toEqual(['C', 'C']);

    // act
    await user.click(within(card(/Overhead Press$/)).getByRole('button', { name: 'Overhead Press actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Superset with next' }));

    // assert
    expect(positions()).toEqual(['C1', 'C2']);
    expect(within(slotGroup('C · Accessories')).getByText('Superset')).toBeInTheDocument();

    // act
    await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Ungroup C1 and C2' }));

    // assert
    expect(positions()).toEqual(['C', 'C']);
  });

  it('names no pattern on an empty slot and offers no pattern choice', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await clearFirstSession(user);

    // assert
    const mainLift = slotGroup('A · Main lift');
    expect(within(mainLift).queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(within(mainLift).queryByText(/^Patterns:/)).not.toBeInTheDocument();
    expect(within(slotGroup('B · Secondary')).queryByRole('group')).not.toBeInTheDocument();
    expect(within(slotGroup('B · Secondary')).queryByText('Any pattern')).not.toBeInTheDocument();
  });

  it('names the pattern of the exercise placed in a slot', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);

    await showAllEquipment(user);
    const source = within(library()).getByRole('button', { name: 'Add Romanian Deadlift' }).closest('li')?.firstElementChild as HTMLElement;
    pointAt(within(slotGroup('A · Main lift')).getByText('Add or drop an exercise').parentElement as HTMLElement);

    // act
    fireEvent.mouseDown(source, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document.body, { clientX: 40, clientY: 40 });
    fireEvent.mouseMove(document.body, { clientX: 60, clientY: 60 });
    fireEvent.mouseUp(document.body, { clientX: 60, clientY: 60 });

    // assert
    expect(within(slotGroup('A · Main lift')).getByText('Hinge')).toBeInTheDocument();
    expect(within(slotGroup('A · Main lift')).queryByText('Squat')).not.toBeInTheDocument();
  });

  it('lists every week of the block as one line of its sets, week 1 included, and opens weeks into their sets', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);

    // act
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));

    // assert
    const weeks = within(main).getByRole('list', { name: /^Sets for .+, week by week$/ });
    expect(within(weeks).getAllByRole('listitem')).toHaveLength(4);
    expect(weekToggle(main, 1)).toHaveAttribute('aria-expanded', 'false');
    expect(weekToggle(main, 1)).toHaveAccessibleName(/^Week 1\b.*: 2 warm-up sets; 3 sets of 12–15, RIR 3\.$/);
    expect(weekItems(main, 2)).toEqual(['Warm-up 2 sets', 'Working 3 sets × 13–15', 'RIR 3', 'Weight by RIR']);
    expect(within(main).queryByRole('textbox', { name: /^Week 2 / })).not.toBeInTheDocument();

    // act
    await openWeeks(user, main, [2, 1]);

    // assert
    expect(weekToggle(main, 2)).toHaveAttribute('aria-expanded', 'true');
    const sets = within(main).getByRole('table', { name: 'Week 2 sets' });
    expect(within(sets).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Set', 'Warm-up', 'Reps 8 or 8–10', 'RIR', 'kgWeight kg', 'Remove']);
    expect(within(sets).getAllByRole('rowheader').map(header => header.textContent)).toEqual(['WWarm-up set 1', 'WWarm-up set 2', '1Set 1', '2Set 2', '3Set 3']);
    expect(weekField(main, 'Week 1 set 1 reps')).toHaveAccessibleDescription('Block default.');
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveValue('13–15');
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveAccessibleDescription('Suggested.');
    expect(weekField(main, 'Week 2 warm-up set 1 reps')).toHaveAccessibleDescription('Same as week 1.');
    expect(within(main).getByText('Week 2 warm-up set 1 RIR: none on a warm-up set')).toBeInTheDocument();
    expect(within(main).getByText('Set by you. Later weeks follow week 1 and keep their own changes.')).toBeInTheDocument();
  });

  it('keeps a value typed in a later week to that week and gives it back when cleared', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2, 3]);
    const weekThree = (weekField(main, 'Week 3 set 1 reps') as HTMLInputElement).value;

    // act
    await retype(user, weekField(main, 'Week 2 set 1 reps'), '15');
    await user.keyboard('{Enter}');

    // assert
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveFocus();
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveValue('15');
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveAccessibleDescription('Set by you.');
    expect(weekField(main, 'Week 2 set 2 reps')).toHaveValue('13–15');
    expect(weekField(main, 'Week 3 set 1 reps')).toHaveValue(weekThree);
    expect(await screen.findByText('Week 2 set 1 reps 15.')).toBeInTheDocument();
    expect(weekToggle(main, 2)).toHaveAccessibleName(/Changed by you\.$/);
    expect(within(main).getByRole('button', { name: 'Reset week 2' })).toBeInTheDocument();

    // act
    await user.clear(weekField(main, 'Week 2 set 1 reps'));
    await user.tab();

    // assert
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveValue('13–15');
    expect(weekField(main, 'Week 2 set 1 reps')).toHaveAccessibleDescription('Suggested.');
    expect(within(main).queryByRole('button', { name: 'Reset week 2' })).not.toBeInTheDocument();
  });

  it('leaves the weight empty to pick it by RIR and lets a decimal weight typed in week 1 flow to later weeks', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [1, 2]);
    const weight = weekField(main, 'Week 1 set 1 weight in kg');
    expect(weight).toHaveValue('');
    expect(weight).toHaveAttribute('placeholder', 'by RIR');
    expect(weight).toHaveAccessibleDescription('Block default. No weight: the client finds it by RIR.');
    expect(weight).toHaveAttribute('inputmode', 'decimal');

    // act
    await user.type(weight, '22,5');
    await user.tab();

    // assert
    expect(weight).toHaveValue('22.5');
    expect(weekField(main, 'Week 2 set 1 weight in kg')).toHaveValue('22.5');
    expect(weekField(main, 'Week 2 set 1 weight in kg')).toHaveAccessibleDescription('Suggested.');
    expect(weekField(main, 'Week 2 set 2 weight in kg')).toHaveValue('');
    expect(await screen.findByText('Week 1 set 1 weight 22.5 kg. Later weeks updated.')).toBeInTheDocument();
  });

  it('adds a set that copies the last working set, to that week only, with focus on its warm-up checkbox', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [3]);
    await retype(user, weekField(main, 'Week 3 set 3 reps'), '10');
    await user.tab();

    // act
    await user.click(within(main).getByRole('button', { name: 'Add a set to week 3' }));

    // assert
    expect(within(main).queryByRole('button', { name: /Warm-up set to week 3/ })).not.toBeInTheDocument();
    expect(within(main).getByRole('checkbox', { name: 'Week 3 set 4 is a warm-up set' })).toHaveFocus();
    expect(weekField(main, 'Week 3 set 4 reps')).toHaveValue('10');
    expect(weekField(main, 'Week 3 set 4 reps')).toHaveAccessibleDescription('Set by you.');
    expect(await screen.findByText('Set added to week 3, 4 working sets.')).toBeInTheDocument();
    expect(weekToggle(main, 3)).toHaveAccessibleName(/: 2 warm-up sets; 2 sets of 14–15; 2 sets of 10; RIR 3\. Changed by you\.$/);
    expect(weekItems(main, 3)).toEqual(['Warm-up 2 sets', 'Working 2 sets × 14–152 sets × 10', 'RIR 33', 'Weight by RIRby RIR']);
    expect(weekToggle(main, 4)).toHaveAccessibleName(/3 sets of/);
    expect(setStats(main)).toContainEqual(expect.stringMatching(/^Progression .*week 3 differs/));

    // act
    await user.keyboard(' ');

    // assert
    expect(within(main).getByRole('checkbox', { name: 'Week 3 warm-up set 3 is a warm-up set' })).toHaveFocus();
    expect(within(main).getByRole('checkbox', { name: 'Week 3 warm-up set 3 is a warm-up set' })).toBeChecked();
    expect(weekItems(main, 3)).toEqual(['Warm-up 3 sets', 'Working 2 sets × 14–151 set × 10', 'RIR 33', 'Weight by RIRby RIR']);

    // act
    await user.tab();

    // assert
    expect(weekField(main, 'Week 3 warm-up set 3 reps')).toHaveFocus();
  });

  it('gives a week without warm-up sets its first one through Set and the warm-up checkbox', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);
    await user.click(within(main).getByRole('button', { name: 'Remove week 2 warm-up set 1' }));
    await user.click(within(main).getByRole('button', { name: 'Remove week 2 warm-up set 1' }));
    expect(weekItems(main, 2)).toContain('Warm-up None');

    // act
    await user.click(within(main).getByRole('button', { name: 'Add a set to week 2' }));
    await user.click(within(main).getByRole('checkbox', { name: 'Week 2 set 4 is a warm-up set' }));

    // assert
    const sets = within(main).getByRole('table', { name: 'Week 2 sets' });
    expect(within(sets).getAllByRole('rowheader').map(header => header.textContent)).toEqual(['WWarm-up set 1', '1Set 1', '2Set 2', '3Set 3']);
    expect(within(main).getByRole('checkbox', { name: 'Week 2 warm-up set 1 is a warm-up set' })).toHaveFocus();
    expect(weekItems(main, 2)[0]).toBe('Warm-up 1 set');
  });

  it('switches a set between warm-up and working with its checkbox, and focus follows the set', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);
    const rowHeaders = () => within(within(main).getByRole('table', { name: 'Week 2 sets' })).getAllByRole('rowheader').map(header => header.textContent);

    // act
    await user.click(within(main).getByRole('checkbox', { name: 'Week 2 set 3 is a warm-up set' }));

    // assert
    expect(rowHeaders()).toEqual(['WWarm-up set 1', 'WWarm-up set 2', 'WWarm-up set 3', '1Set 1', '2Set 2']);
    expect(within(main).getByRole('checkbox', { name: 'Week 2 warm-up set 3 is a warm-up set' })).toHaveFocus();
    expect(within(main).getByRole('checkbox', { name: 'Week 2 warm-up set 3 is a warm-up set' })).toBeChecked();
    expect(await screen.findByText('Week 2 set 3 is now a warm-up set.')).toBeInTheDocument();
    expect(weekToggle(main, 3)).toHaveAccessibleName(/2 warm-up sets; 3 sets of/);

    // act
    await user.click(within(main).getByRole('checkbox', { name: 'Week 2 warm-up set 1 is a warm-up set' }));

    // assert
    expect(rowHeaders()).toEqual(['WWarm-up set 1', 'WWarm-up set 2', '1Set 1', '2Set 2', '3Set 3']);
    expect(within(main).getByRole('checkbox', { name: 'Week 2 set 1 is a warm-up set' })).toHaveFocus();
    expect(within(main).getByRole('checkbox', { name: 'Week 2 set 1 is a warm-up set' })).not.toBeChecked();
  });

  it('removes a set from that week only, hands focus to the next set and always keeps one working set', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);

    // act
    await user.click(within(main).getByRole('button', { name: 'Remove week 2 set 2' }));

    // assert
    expect(within(main).queryByRole('textbox', { name: 'Week 2 set 3 reps' })).not.toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Remove week 2 set 2' })).toHaveFocus();
    expect(await screen.findByText('Set 2 removed from week 2.')).toBeInTheDocument();
    expect(weekToggle(main, 3)).toHaveAccessibleName(/3 sets of/);

    // act
    await user.click(within(main).getByRole('button', { name: 'Remove week 2 set 2' }));

    // assert
    expect(within(main).queryByRole('button', { name: 'Remove week 2 set 1' })).not.toBeInTheDocument();
    expect(within(main).getByRole('checkbox', { name: 'Week 2 set 1 is a warm-up set' })).toBeDisabled();
  });

  it('reads working sets that differ only in RIR as one kind of set, with their RIR from lowest to highest', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);

    // act
    await retype(user, weekField(main, 'Week 2 set 3 RIR'), '2');
    await user.tab();

    // assert
    expect(weekField(main, 'Week 2 set 3 RIR')).toHaveAccessibleDescription('Set by you.');
    expect(weekToggle(main, 2)).toHaveAccessibleName(/: 2 warm-up sets; 3 sets of [^;]+, RIR 2–3[,.]/);
    expect(weekItems(main, 2)[2]).toBe('RIR 2–3');
    expect(within(main).queryByRole('button', { name: 'Apply to all working sets of week 2' })).not.toBeInTheDocument();
    expect(setStats(main)).not.toContainEqual(expect.stringMatching(/week 2 differs/));
  });

  it('reads working sets that differ only in weight as different sets on the card and on the week alike', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [1]);

    // act
    await user.type(weekField(main, 'Week 1 set 1 weight in kg'), '30');
    await user.tab();

    // assert
    expect(setStats(main)).toContain('Working 3 sets, varied');
    expect(weekItems(main, 1)).toContain('Working 1 set × 12–152 sets × 12–15');
    expect(weekItems(main, 1)).toContain('Weight 30 kgby RIR');
  });

  it('gives every working set of a week the first one’s reps and weight with Apply to all working sets, and leaves each RIR', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);
    expect(within(main).queryByRole('button', { name: 'Apply to all working sets of week 2' })).not.toBeInTheDocument();
    await retype(user, weekField(main, 'Week 2 set 3 RIR'), '2');
    await retype(user, weekField(main, 'Week 2 set 1 weight in kg'), '30');
    await user.tab();

    // act
    await user.click(within(main).getByRole('button', { name: 'Apply to all working sets of week 2' }));

    // assert
    expect(weekField(main, 'Week 2 set 3 weight in kg')).toHaveValue('30');
    expect(weekField(main, 'Week 2 set 3 weight in kg')).toHaveAccessibleDescription('Set by you.');
    expect(weekField(main, 'Week 2 set 3 RIR')).toHaveValue('2');
    expect(weekField(main, 'Week 2 set 2 RIR')).toHaveValue('3');
    expect(within(main).queryByRole('button', { name: 'Apply to all working sets of week 2' })).not.toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Add a set to week 2' })).toHaveFocus();
  });

  it('gives a week back to its suggestions with one reset', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [3]);
    await user.click(within(main).getByRole('button', { name: 'Add a set to week 3' }));
    await retype(user, weekField(main, 'Week 3 set 1 RIR'), '1');
    await user.tab();

    // act
    await user.click(within(main).getByRole('button', { name: 'Reset week 3' }));

    // assert
    expect(within(main).queryByRole('textbox', { name: 'Week 3 set 4 reps' })).not.toBeInTheDocument();
    expect(weekField(main, 'Week 3 set 1 RIR')).toHaveValue('3');
    expect(weekToggle(main, 3)).toHaveFocus();
    expect(await screen.findByText('Week 3 back to suggested.')).toBeInTheDocument();
  });

  it('commits on blur, restores with Escape and flags text it cannot read', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [4]);
    const rir = weekField(main, 'Week 4 set 1 RIR');

    // act
    await retype(user, rir, '1');
    await user.keyboard('{Escape}');

    // assert
    expect(rir).toHaveValue('3');

    // act
    await retype(user, rir, 'soon');
    await user.tab();

    // assert
    expect(rir).toHaveAccessibleDescription('Suggested. Use one whole number, like 2');
    expect(within(main).queryByRole('button', { name: 'Reset week 4' })).not.toBeInTheDocument();

    // act
    await retype(user, rir, '2–3');
    await user.tab();

    // assert
    expect(rir).toHaveAccessibleDescription('Suggested. Use one whole number, like 2');
    expect(rir).toHaveAttribute('inputmode', 'numeric');
  });

  it('moves to the same column of the set above or below with Arrow Up and Arrow Down, across open weeks', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [1, 2]);
    weekField(main, 'Week 2 set 1 RIR').focus();

    // act
    await user.keyboard('{ArrowUp}');

    // assert
    expect(weekField(main, 'Week 1 set 3 RIR')).toHaveFocus();

    // act
    await user.keyboard('{ArrowDown}{ArrowDown}');

    // assert
    expect(weekField(main, 'Week 2 set 2 RIR')).toHaveFocus();
    expect(within(main).getByRole('table', { name: 'Week 2 sets' })).toHaveAccessibleDescription('Arrow Up and Arrow Down move to the same field of the set above or below.');
  });

  it('moves between the warm-up switches with the arrows too, and leaves an arrow with a modifier key to the browser', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [2]);
    within(main).getByRole('checkbox', { name: 'Week 2 set 2 is a warm-up set' }).focus();

    // act
    await user.keyboard('{ArrowUp}');

    // assert
    expect(within(main).getByRole('checkbox', { name: 'Week 2 set 1 is a warm-up set' })).toHaveFocus();

    // act
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');

    // assert
    expect(within(main).getByRole('checkbox', { name: 'Week 2 set 1 is a warm-up set' })).toHaveFocus();
  });

  it('keeps rest beside the weeks, apart from the set actions', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    const rest = within(main).getByRole('textbox', { name: 'Rest between sets' });

    // act
    await user.clear(rest);
    await user.type(rest, 'soon');
    await user.tab();

    // assert
    expect(rest).toHaveAccessibleDescription('Use seconds or m:ss like 1:30');
    expect(within(main).queryByRole('button', { name: /^Reset week/ })).not.toBeInTheDocument();
  });

  it('sets the progression rule in Details, where Custom makes every week repeat the first', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Details for / }));

    // act
    await user.click(within(main).getByRole('combobox', { name: 'Progression' }));
    await user.click(await screen.findByRole('option', { name: 'Custom' }));
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    await openWeeks(user, main, [3]);

    // assert
    expect(weekField(main, 'Week 3 set 1 reps')).toHaveValue('12–15');
    expect(weekField(main, 'Week 3 set 1 reps')).toHaveAccessibleDescription('Same as week 1.');
    expect(within(main).getByText('Set by you. Later weeks repeat week 1 and keep their own changes.')).toBeInTheDocument();
  });

  it('opens one panel of a card at a time', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    const sets = within(main).getByRole('button', { name: /^Sets for / });
    const details = within(main).getByRole('button', { name: /^Details for / });
    await user.click(sets);

    // act
    await user.click(details);

    // assert
    expect(sets).toHaveAttribute('aria-expanded', 'false');
    expect(details).toHaveAttribute('aria-expanded', 'true');
    expect(within(main).queryByRole('textbox', { name: 'Rest between sets' })).not.toBeInTheDocument();
    expect(within(main).getByRole('group', { name: 'Substitutions' })).toBeInTheDocument();
  });

  it('plays the exercise video in a dialog from the exercise name', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    const trigger = within(main).getByRole('button', { description: /cues and video/ });
    const exerciseName = trigger.textContent ?? '';

    // act
    await user.click(trigger);

    // assert
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(exerciseName);
    expect(dialog.querySelector('video[controls]')).not.toBeNull();

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    // assert
    expect(trigger).toHaveFocus();
    expect(within(main).getByRole('heading', { level: 5 })).toHaveAccessibleName(`A ${exerciseName}`);
  });

  it('builds a cardio day from the intervals preset', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    const cardio = session('Cardio');

    // act
    await user.click(within(cardio).getByRole('button', { name: 'Intervals' }));

    // assert
    const built = session('Intervals');
    expect(within(built).getAllByText('26 min')[0]).toBeInTheDocument();
    expect(within(built).getAllByRole('article').map(segment => within(segment).getAllByText(/^(Steady|Intervals)$/)[0].textContent)).toEqual([
      'Steady',
      'Intervals',
      'Steady',
    ]);
    expect(within(day('Saturday')).getAllByText('26 min')).toHaveLength(2);
  });

  it('edits a steady segment and adds intervals', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Moderate cardio' }));
    const cardio = session('Moderate cardio');

    // act
    await retype(user, within(cardio).getByRole('spinbutton', { name: 'Minutes' }), '40');

    // assert
    expect(within(cardio).getByText('40 min')).toBeInTheDocument();

    // act
    await user.click(within(cardio).getByRole('button', { name: 'Add segment to Moderate cardio' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Intervals' }));

    // assert
    expect(within(cardio).getAllByRole('article')).toHaveLength(2);
    expect(within(within(cardio).getByRole('article', { name: /Intervals/ })).getByRole('button', { name: 'Add exercise to the intervals' })).toBeInTheDocument();
  });

  it('replaces a segment exercise from the library in cardio mode', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Moderate cardio' }));

    // act
    await user.click(within(session('Moderate cardio')).getByRole('button', { name: /^Replace / }));

    // assert
    expect(within(library()).getByRole('searchbox', { name: 'Search exercises' })).toHaveAccessibleDescription('Adding to Moderate cardio');
    expect(within(library()).getByRole('combobox', { name: 'Exercise type' })).toHaveTextContent('Cardio');

    // act
    await addFromLibrary(user, 'Rowing machine');

    // assert
    expect(within(session('Moderate cardio')).getByRole('button', { name: 'Replace Rowing machine' })).toBeInTheDocument();
  });

  it('edits a warm-up exercise with its sets and reps and removes it', async () => {
    // arrange
    const user = await openFirstBlock();
    const warmUp = within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });
    expect(within(warmUp).getByRole('textbox', { name: '90/90 Hip Switches reps' })).toHaveValue('10');

    // act
    await retype(user, within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' }), '2');
    await retype(user, within(warmUp).getByRole('textbox', { name: '90/90 Hip Switches reps' }), '8');

    // assert
    expect(within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' })).toHaveValue(2);
    expect(within(warmUp).getByRole('textbox', { name: '90/90 Hip Switches reps' })).toHaveValue('8');

    // act
    await user.click(within(warmUp).getByRole('button', { name: '90/90 Hip Switches actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));

    // assert
    expect(within(session('Full Body A')).queryByRole('spinbutton', { name: '90/90 Hip Switches sets' })).not.toBeInTheDocument();
  });

  it('adds a timed conditioning exercise to the warm-up from the mobility picker and sets its seconds', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' }));

    // assert
    expect(within(library()).getByRole('combobox', { name: 'Exercise type' })).toHaveTextContent('Mobility');
    expect(within(library()).getByRole('button', { name: 'Add Jumping Jacks' })).toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Jumping Jacks');

    // assert
    const warmUp = within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });
    expect(within(warmUp).getByRole('spinbutton', { name: 'Jumping Jacks seconds' })).toHaveValue(45);

    // act
    await retype(user, within(warmUp).getByRole('spinbutton', { name: 'Jumping Jacks seconds' }), '60');

    // assert
    expect(within(warmUp).getByRole('spinbutton', { name: 'Jumping Jacks seconds' })).toHaveValue(60);
  });

  it('builds the cool-down from stretches only once it is on, with no free text', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(session('Full Body A')).queryByRole('button', { name: 'Add stretch to cool-down' })).not.toBeInTheDocument();

    // act
    await user.click(within(session('Full Body A')).getByRole('switch', { name: 'Cool-down' }));

    // assert
    expect(within(session('Full Body A')).queryByRole('textbox', { name: /cool-down/i })).not.toBeInTheDocument();

    // act
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add stretch to cool-down' }));

    // assert
    expect(within(library()).getByRole('combobox', { name: 'Exercise type' })).toHaveTextContent('Stretching');

    // act
    await addFromLibrary(user, 'Couch Stretch');

    // assert
    const stretches = within(session('Full Body A')).getByRole('region', { name: 'Cool-down' });
    expect(within(stretches).getByRole('spinbutton', { name: 'Couch Stretch seconds' })).toHaveValue(30);
  });

  it('says an exercise is already in the warm-up instead of that it was added, and keeps one of it', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' }));

    // act
    await addFromLibrary(user, '90/90 Hip Switches');

    // assert
    expect(await screen.findByText('90/90 Hip Switches is already in the warm-up')).toBeInTheDocument();
    expect(screen.queryByText(/90\/90 Hip Switches added/)).not.toBeInTheDocument();
    const warmUp = within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });
    expect(within(warmUp).getAllByRole('spinbutton', { name: '90/90 Hip Switches sets' })).toHaveLength(1);
  });

  it('says the warm-up holds four exercises instead of that a fifth was added', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' }));
    await addFromLibrary(user, 'Jumping Jacks');
    await user.click(within(library()).getByRole('button', { name: 'Add Burpee' }));
    await user.click(within(library()).getByRole('button', { name: 'Add Mountain Climber' }));
    expect(await screen.findByText('Mountain Climber added to Full Body A · Warm-up')).toBeInTheDocument();

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Squat Jump' }));

    // assert
    expect(await screen.findByText('Squat Jump not added: the warm-up holds four exercises')).toBeInTheDocument();
    expect(screen.queryByText('Squat Jump added to Full Body A · Warm-up')).not.toBeInTheDocument();
    const warmUp = within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });
    expect(within(warmUp).queryByRole('spinbutton', { name: 'Squat Jump sets' })).not.toBeInTheDocument();
  });

  it('says a stretch is already in the cool-down instead of that it was added', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(within(session('Full Body A')).getByRole('switch', { name: 'Cool-down' }));
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add stretch to cool-down' }));
    await addFromLibrary(user, 'Couch Stretch');
    expect(await screen.findByText('Couch Stretch added to Full Body A · Cool-down')).toBeInTheDocument();

    // act
    await user.click(within(library()).getByRole('button', { name: 'Add Couch Stretch' }));

    // assert
    expect(await screen.findByText('Couch Stretch is already in the cool-down')).toBeInTheDocument();
    const stretches = within(session('Full Body A')).getByRole('region', { name: 'Cool-down' });
    expect(within(stretches).getAllByRole('spinbutton', { name: 'Couch Stretch seconds' })).toHaveLength(1);
  });

  it('says an exercise cannot be its own substitution, or one it already has, instead of that it was added', async () => {
    // arrange
    const { user, substitutions, mainName, held } = await openSubstitutionPickerWithOneHeld();

    // act
    await user.click(within(library()).getByRole('button', { name: `Add ${mainName}` }));

    // assert
    expect(await screen.findByText(`${mainName} can’t be its own substitution`)).toBeInTheDocument();

    // act
    await user.click(within(library()).getByRole('button', { name: `Add ${held}` }));

    // assert
    expect(await screen.findByText(`${held} is already one of its substitutions`)).toBeInTheDocument();
    expect(within(substitutions).getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  });

  it('says an exercise holds two substitutions instead of that a third was added', async () => {
    // arrange
    const { user, substitutions, mainName, held } = await openSubstitutionPickerWithOneHeld();
    const [second, third] = within(library())
      .getAllByRole('button', { name: /^Add / })
      .map(button => (button.getAttribute('aria-label') ?? '').replace(/^Add /, ''))
      .filter(name => name !== mainName && name !== held);
    await user.click(within(library()).getByRole('button', { name: `Add ${second}` }));
    expect(await screen.findByText(`${second} added to the substitutions for ${mainName}`)).toBeInTheDocument();

    // act
    await user.click(within(library()).getByRole('button', { name: `Add ${third}` }));

    // assert
    expect(await screen.findByText(`${third} not added: an exercise holds two substitutions`)).toBeInTheDocument();
    expect(within(substitutions).getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
    expect(within(substitutions).queryByRole('button', { name: `Remove ${third}` })).not.toBeInTheDocument();
  });

  it('says a cardio session takes cardio exercises instead of that a lifting exercise was added', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Moderate cardio' }));

    // act
    await addFromLibrary(user, 'Plank');

    // assert
    expect(await screen.findByText('Plank not added: a cardio session takes cardio exercises')).toBeInTheDocument();
    expect(screen.queryByText(/Plank added/)).not.toBeInTheDocument();
  });

  it('removes substitutions and suggests them again', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Details for / }));
    const substitutions = within(main).getByRole('group', { name: 'Substitutions' });
    const chips = within(substitutions).getAllByRole('button', { name: /^Remove / });
    expect(chips.length).toBeGreaterThan(0);

    // act
    for (const chip of chips) await user.click(chip);

    // assert
    expect(within(substitutions).queryAllByRole('button', { name: /^Remove / })).toHaveLength(0);

    // act
    await user.click(within(substitutions).getByRole('button', { name: 'Suggest' }));

    // assert
    expect(within(substitutions).getAllByRole('button', { name: /^Remove / })).toHaveLength(chips.length);
  });

  it('keeps Move up and down inside the slot and moves a card to another slot from its menu', async () => {
    // arrange
    const user = await openFirstBlock();
    const [mainName] = within(card(/^A /)).getAllByRole('heading', { level: 5 }).map(heading => within(heading).getByRole('button').textContent ?? '');
    await user.click(within(card(/^A /)).getByRole('button', { name: /actions$/ }));
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toHaveAttribute('data-disabled');
    expect(screen.queryByRole('menuitem', { name: /^Move to B / })).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Move to C · Accessories' }));

    // assert
    const moved = within(slotGroup('C · Accessories')).getByRole('article', { name: new RegExp(`${mainName}$`) });
    expect(within(moved).getByRole('button', { name: `${mainName} actions` })).toHaveFocus();
    expect(within(slotGroup('A · Main lift')).getByRole('button', { name: 'Add or drop an exercise in A · Main lift' })).toBeInTheDocument();
  });

  it('changing the block type refills untouched values', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Block type' }));
    await user.click(screen.getByRole('option', { name: 'Hypertrophy' }));

    // assert
    expect(setStats(card(/^A /))).toEqual(['Warm-up 2 sets', 'Working 4 sets × 6–10', 'RIR 2–3', 'Rest 2:30', 'Progression 6 → 9 reps6 to 9 reps']);
  });

  it('estimates the session minutes from what its longest week contains, against the target', async () => {
    // arrange
    const user = await openFirstBlock();
    const estimate = () => within(session('Full Body A')).getByText(/of 60 min$/).textContent;
    expect(estimate()).toBe('~35 of 60 min');

    // act
    await clearFirstSession(user);

    // assert
    expect(estimate()).toBe('~2 of 60 min');
  });

  it('rebuilds the sessions from a new split shape after confirmation', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Split' }));
    await user.click(screen.getByRole('option', { name: 'Upper / Lower' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Change the split?' });
    expect(within(confirm).getByText(/^Full Body A · \d+ exercises$/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(within(day('Monday')).getByRole('button', { name: /^Lower A\s+about \d+ min$/ })).toBeInTheDocument();
    expect(within(session('Lower A')).getAllByText('Add or drop an exercise')).toHaveLength(4);
  });

  it('asks before fewer training days drop a session and rebuilds the week', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Training days' }));
    await user.click(screen.getByRole('option', { name: '2 days' }));

    // assert
    const confirm = screen.getByRole('alertdialog', { name: 'Change training days?' });
    expect(within(confirm).getByText(/^Full Body C · \d+ exercises$/)).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Training days' })).toHaveTextContent('2 days');
    expect(within(day('Monday')).getByRole('button', { name: /^Full Body A\s+about \d+ min$/ })).toBeInTheDocument();
    expect(within(day('Thursday')).getByRole('button', { name: /^Full Body B\s+about \d+ min$/ })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Full Body C' })).not.toBeInTheDocument();
  });

  it('asks before a cardio day with segments becomes a rest day, naming the session', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Easy cardio' }));

    // act
    await chooseInDayMenu(user, 'Saturday', 'Rest');

    // assert
    const confirm = screen.getByRole('alertdialog', { name: 'Make Saturday a rest day?' });
    expect(within(confirm).getByText('Easy cardio · 1 segment')).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Change day' }));

    // assert
    expect(within(day('Saturday')).getByText('Rest')).toBeInTheDocument();
  });

  it('asks before a strength day with exercises becomes a rest day and removes its session', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await chooseInDayMenu(user, 'Monday', 'Rest');

    // assert
    const confirm = screen.getByRole('alertdialog', { name: 'Make Monday a rest day?' });
    expect(within(confirm).getByText(/^Full Body A · \d+ exercises$/)).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Change day' }));

    // assert
    expect(within(day('Monday')).getByText('Rest')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Full Body A' })).not.toBeInTheDocument();
  });

  it('builds intervals from cardio and conditioning exercises and shows their minutes', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Add segment to Cardio' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Intervals' }));
    const rounds = () => within(session('Cardio')).getByRole('article', { name: /Intervals/ });

    // act
    await user.click(within(rounds()).getByRole('button', { name: 'Add exercise to the intervals' }));

    // assert
    expect(within(library()).getByRole('combobox', { name: 'Exercise type' })).toHaveTextContent('Cardio');
    expect(within(library()).getByRole('button', { name: 'Add Burpee' })).toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Burpee');

    // assert
    expect(within(rounds()).getByRole('spinbutton', { name: 'Burpee reps' })).toHaveValue(12);
    expect(within(rounds()).getByText(/ · 4 min$/)).toBeInTheDocument();

    // act
    await retype(user, within(rounds()).getByRole('spinbutton', { name: 'Rounds' }), '5');

    // assert
    expect(within(rounds()).getByText('5 rounds · 7 min')).toBeInTheDocument();
  });

  it('collapses the block header to one line once the editor scrolls past it and expands it on demand', async () => {
    // arrange
    const user = await openFirstBlock();
    const editor = screen.getByRole('main', { name: 'Program editor' });
    expect(screen.queryByRole('button', { name: 'Block settings' })).not.toBeInTheDocument();

    // act
    editor.scrollTop = 120;
    fireEvent.scroll(editor);

    // assert
    const toggle = screen.getByRole('button', { name: 'Block settings' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Foundation · 4 wk')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Weeks' })).not.toBeInTheDocument();

    // act
    await user.click(toggle);

    // assert
    expect(screen.getByRole('button', { name: 'Block settings' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Block settings' })).toHaveFocus();
    expect(screen.getByRole('spinbutton', { name: 'Weeks' })).toBeInTheDocument();

    // act
    editor.scrollTop = 0;
    fireEvent.scroll(editor);

    // assert
    expect(screen.queryByRole('button', { name: 'Block settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Weeks' })).toBeInTheDocument();
  });
});

function stubMeasuredHeaders(height: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return DOMRect.fromRect({ height: this.tagName === 'HEADER' ? height : 0 });
  });
}

async function addToAccessories(user: User, name: string) {
  await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: /^Add (exercise to|or drop an exercise in) C · Accessories$/ }));
  await addFromLibrary(user, name);
}

async function openCardioDay(user: User, preset: string) {
  await chooseInDayMenu(user, 'Saturday', 'Cardio');
  await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
  await user.click(within(session('Cardio')).getByRole('button', { name: preset }));
}

describe('BlockWorkspace keyboard and screen reader support', () => {
  it('measures the block header so session headers stick right under it', async () => {
    // arrange
    stubMeasuredHeaders(132);

    // act
    await openFirstBlock();

    // assert
    const workspace = screen.getByRole('heading', { level: 2, name: 'Foundation' }).closest('section') as HTMLElement;
    expect(workspace.style.getPropertyValue('--block-header-height')).toBe('132px');
  });

  it('moves focus to the session name when a collapsed session expands', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(within(session('Full Body B')).getByRole('button', { name: /^Full Body B/ }));

    // assert
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('Full Body B');
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveFocus();
  });

  it('returns focus to the day menu when the rest day confirmation is cancelled', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Monday', 'Rest');
    const confirm = screen.getByRole('alertdialog', { name: 'Make Monday a rest day?' });

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));

    // assert
    expect(within(week()).getByRole('button', { name: 'Monday options' })).toHaveFocus();
  });

  it('returns focus to the training days field when its rebuild is dismissed with Escape', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(screen.getByRole('combobox', { name: 'Training days' }));
    await user.click(screen.getByRole('option', { name: '2 days' }));
    expect(screen.getByRole('alertdialog', { name: 'Change training days?' })).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.getByRole('combobox', { name: 'Training days' })).toHaveFocus();
  });

  it('announces adding, grouping, moving and ungrouping exercises', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    expect(await screen.findByText('Full Body A cleared')).toBeInTheDocument();

    // act
    await addToAccessories(user, 'Overhead Press');

    // assert
    expect(await screen.findByText('Overhead Press added to Full Body A · C Accessories')).toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Dumbbell Rows');
    await user.click(within(card(/Overhead Press$/)).getByRole('button', { name: 'Overhead Press actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Superset with next' }));

    // assert
    expect(await screen.findByText('Overhead Press and Dumbbell Rows grouped as a superset')).toBeInTheDocument();

    // act
    await user.click(within(card(/Dumbbell Rows$/)).getByRole('button', { name: 'Dumbbell Rows actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move up' }));

    // assert
    expect(await screen.findByText('Dumbbell Rows moved up')).toBeInTheDocument();

    // act
    await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Ungroup C1 and C2' }));

    // assert
    expect(await screen.findByText('C1 and C2 ungrouped')).toBeInTheDocument();
    expect(positions()).toEqual(['C', 'C']);
  });

  it('names a warm-up set count in the singular for one set', async () => {
    // arrange
    const user = await openFirstBlock();
    const warmUp = within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });

    // act
    await retype(user, within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' }), '1');

    // assert
    expect(within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' })).toHaveAccessibleDescription('set ×');
  });

  it('builds a single-exercise interval with its rounds, work, easy time and rest between rounds all in reach', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Add segment to Cardio' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Intervals' }));
    const rounds = () => within(session('Cardio')).getByRole('article', { name: /Intervals/ });
    await user.click(within(rounds()).getByRole('button', { name: 'Add exercise to the intervals' }));
    await addFromLibrary(user, 'Burpee');

    // act
    await retype(user, within(rounds()).getByRole('spinbutton', { name: 'Rounds' }), '4');
    await user.click(within(rounds()).getByRole('radio', { name: 'Sec' }));
    await retype(user, within(rounds()).getByRole('spinbutton', { name: 'Burpee seconds' }), '30');
    await retype(user, within(rounds()).getByRole('textbox', { name: 'Easy after each exercise' }), '30');
    await retype(user, within(rounds()).getByRole('textbox', { name: 'Rest between rounds' }), '1:00');
    await user.tab();

    // assert
    expect(within(rounds()).getByRole('heading', { level: 5 })).toHaveTextContent('Intervals4 rounds · 7 min');
    expect(within(rounds()).getByRole('textbox', { name: 'Rest between rounds' })).toHaveValue('1:00');
    const steps = within(within(rounds()).getByRole('list', { name: 'Interval exercises' })).getByRole('listitem');
    expect(steps).toHaveTextContent(/Burpee.*then30 s easy$/);
    expect(steps).not.toHaveTextContent('Hard');
  });

  it('clears a cardio session from its header menu after confirmation', async () => {
    // arrange
    const user = await openFirstBlock();
    await openCardioDay(user, 'Easy cardio');

    const cardio = screen.getByRole('textbox', { name: 'Session name' }).closest('article') as HTMLElement;

    // act
    await user.click(within(cardio).getByRole('button', { name: 'Easy cardio actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Clear segments' }));
    await user.click(within(screen.getByRole('alertdialog', { name: 'Clear Easy cardio?' })).getByRole('button', { name: 'Clear segments' }));

    // assert
    expect(within(cardio).getByRole('group', { name: 'Start from' })).toBeInTheDocument();
    expect(await screen.findByText('Easy cardio cleared')).toBeInTheDocument();
  });

  it('keeps focus on a moved card and hands it to the next card, then the add button, after a remove', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    await addToAccessories(user, 'Overhead Press');
    await addFromLibrary(user, 'Dumbbell Rows');

    // act
    await user.click(within(card(/Overhead Press$/)).getByRole('button', { name: 'Overhead Press actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move down' }));

    // assert
    expect(positions()).toEqual(['C', 'C']);
    expect(within(card(/Overhead Press$/)).getByRole('button', { name: 'Overhead Press actions' })).toHaveFocus();

    // act
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));

    // assert
    expect(within(card(/Dumbbell Rows$/)).getByRole('button', { name: 'Dumbbell Rows actions' })).toHaveFocus();

    // act
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));

    // assert
    expect(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Add or drop an exercise in C · Accessories' })).toHaveFocus();
  });

  it('hands focus to the next warm-up exercise after a remove and to Add exercise once the list empties', async () => {
    // arrange
    const user = await openFirstBlock();
    const warmUp = () => within(session('Full Body A')).getByRole('region', { name: 'Warm-up' });
    await user.click(within(warmUp()).getByRole('button', { name: '90/90 Hip Switches actions' }));

    // act
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));

    // assert
    expect(within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' })).toHaveFocus();
  });
});

describe('BlockWorkspace icon actions', () => {
  it('names each icon-only add action in full without visible words', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(within(session('Full Body A')).getByRole('switch', { name: 'Cool-down' }));

    // assert
    expect(within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' })).toHaveTextContent('');
    expect(within(session('Full Body A')).getByRole('button', { name: 'Add stretch to cool-down' })).toHaveTextContent('');
    expect(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Add exercise to C · Accessories' })).toHaveTextContent('');
  });

  it('shows the hint of an icon-only action while it has keyboard focus', async () => {
    // arrange
    const user = await openFirstBlock();
    const warmUpAdd = within(session('Full Body A')).getByRole('button', { name: 'Add exercise to warm-up' });
    const before = within(session('Full Body A')).getByRole('heading', { name: 'Warm-up' });
    before.setAttribute('tabindex', '-1');
    before.focus();

    // act
    await user.tab();

    // assert
    expect(warmUpAdd).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Add exercise');
  });
});

describe('BlockWorkspace weeks of a Hypertrophy block', () => {
  async function openHypertrophySquat() {
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^2 Hypertrophy\b/ }));
    const squat = card(/^A /);
    await user.click(within(squat).getByRole('button', { name: 'Sets for Barbell Back Squat' }));
    return { user, squat };
  }

  it('numbers the weeks by the plan and suggests later weeks from a weight typed in the first week', async () => {
    // arrange
    const { user, squat } = await openHypertrophySquat();
    await openWeeks(user, squat, [5, 6]);

    // act
    await user.type(weekField(squat, 'Week 5 set 1 weight in kg'), '60');
    await user.tab();

    // assert
    expect(weekField(squat, 'Week 5 set 1 weight in kg')).toHaveAccessibleDescription('Set by you.');
    expect(weekField(squat, 'Week 6 set 1 weight in kg')).toHaveValue('60');
    expect(weekField(squat, 'Week 6 set 1 weight in kg')).toHaveAccessibleDescription('Suggested.');
    expect(setStats(squat).some(stat => stat.startsWith('Progression '))).toBe(true);
  });

  it('shows the calibration week like any other week, with its weight found by RIR and weights led by the week after it', async () => {
    // arrange
    const { user, squat } = await openHypertrophySquat();

    // act
    await user.click(screen.getByRole('switch', { name: /Calibration week/ }));
    await openWeeks(user, squat, [5, 6]);

    // assert
    expect(within(squat).queryByRole('textbox', { name: 'Week 5 set 1 weight in kg' })).not.toBeInTheDocument();
    expect(within(squat).getByText('Week 5 set 1 weight: none, the client finds it by RIR in the calibration week')).toBeInTheDocument();
    expect(within(squat).getByText('Calibration')).toBeInTheDocument();
    expect(weekField(squat, 'Week 5 set 1 reps')).toBeInTheDocument();
    expect(weekField(squat, 'Week 6 set 1 weight in kg')).toHaveAttribute('placeholder', 'by RIR');
    expect(within(squat).getByText('Set by you. Later weeks follow week 5 (weights: week 6) and keep their own changes.')).toBeInTheDocument();
  });

  it('clears everything the coach did in every week with Reset to block defaults', async () => {
    // arrange
    const { user, squat } = await openHypertrophySquat();
    await openWeeks(user, squat, [7, 8]);
    await retype(user, weekField(squat, 'Week 7 set 1 reps'), '8');
    await user.tab();
    await user.click(within(squat).getByRole('button', { name: 'Add a set to week 8' }));

    // act
    await user.click(within(squat).getByRole('button', { name: 'Barbell Back Squat actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Reset to block defaults' }));

    // assert
    expect(weekField(squat, 'Week 7 set 1 reps')).toHaveAccessibleDescription('Suggested.');
    expect(within(squat).queryByRole('textbox', { name: 'Week 8 set 5 reps' })).not.toBeInTheDocument();
    expect(within(squat).queryByRole('button', { name: /^Reset week/ })).not.toBeInTheDocument();
  });

  it('shows a Deload block as the same list with its one week', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^3 Deload\b/ }));
    const squat = card(/^A /);

    // act
    await user.click(within(squat).getByRole('button', { name: 'Sets for Barbell Back Squat' }));
    await openWeeks(user, squat, [11]);

    // assert
    expect(within(within(squat).getByRole('list', { name: 'Sets for Barbell Back Squat, week by week' })).getAllByRole('listitem')).toHaveLength(1);
    expect(weekField(squat, 'Week 11 set 1 RIR')).toHaveValue('4');
    expect(within(squat).getByText('Set by you.')).toBeInTheDocument();
  });
});

describe('BlockWorkspace with the first week and no cardio', () => {
  async function openFirstWeekBlock() {
    const user = renderProgramEditor('&pseed=draft&jstage=approved&psessions=first-week');
    await user.click(within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation\b/ }));
    return user;
  }

  function stubNarrowWeek() {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly onResize: (entries: { contentRect: { width: number } }[]) => void) {}
        observe() {
          this.onResize([{ contentRect: { width: 320 } }]);
        }
        unobserve() {}
        disconnect() {}
      },
    );
  }

  it('offers Details only on a card, with no Sets disclosure, no Progression item and no reset in its menu', async () => {
    // arrange
    const user = await openFirstWeekBlock();
    const main = card(/^A /);

    // act
    await user.click(within(main).getByRole('button', { name: / actions$/ }));

    // assert
    expect(within(main).getByRole('button', { name: /^Details for / })).toBeInTheDocument();
    expect(within(main).queryByRole('button', { name: /^Sets for / })).not.toBeInTheDocument();
    expect(setStats(main)).toEqual(['Warm-up 2 sets', 'Working 3 sets × 12–15', 'RIR 3', 'Rest 1:15']);
    expect(await screen.findByRole('menuitem', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reset to block defaults' })).not.toBeInTheDocument();
  });

  it('shows a cardio day as a face that is not a button, and lists no cardio card', async () => {
    // arrange
    const user = await openFirstWeekBlock();

    // act
    await chooseInDayMenu(user, 'Saturday', 'Cardio');

    // assert
    const saturday = day('Saturday');
    expect(within(saturday).getByText('Cardio')).toBeInTheDocument();
    expect(within(saturday).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['Saturday options']);
    expect(screen.queryByRole('article', { name: 'Cardio' })).not.toBeInTheDocument();
    expect(within(day('Monday')).getByRole('button', { name: /^Full Body A\s+about \d+ min$/ })).toBeInTheDocument();
  });

  it('gives a cardio day in the narrow week no Open session and starts the rail on the first strength day', async () => {
    // arrange
    stubNarrowWeek();
    const user = await openFirstWeekBlock();

    // act
    const days = within(week()).getByRole('tablist', { name: 'Days' });
    await user.click(within(days).getByRole('tab', { name: /^Saturday/ }));
    await chooseInDayMenu(user, 'Saturday', 'Cardio');

    // assert
    expect(within(week()).getByRole('tab', { name: /^Saturday.*Cardio/, selected: true })).toBeInTheDocument();
    expect(within(week()).queryByRole('button', { name: 'Open session' })).not.toBeInTheDocument();

    // act
    await user.click(within(days).getByRole('tab', { name: /^Monday/ }));

    // assert
    expect(within(week()).getByRole('button', { name: 'Open session' })).toBeInTheDocument();
  });

  it('opens the first strength session when a cardio day comes first in the week', async () => {
    // arrange
    const user = await openFirstWeekBlock();

    // act
    await chooseInDayMenu(user, 'Monday', 'Cardio');
    const confirm = screen.queryByRole('alertdialog');
    if (confirm) await user.click(within(confirm).getByRole('button', { name: 'Change day' }));

    // assert
    expect(within(week()).queryByRole('button', { name: 'Cardio' })).not.toBeInTheDocument();
    expect(within(session('Full Body B')).getAllByRole('article').length).toBeGreaterThan(0);
  });
});
