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
  await user.click(within(screen.getByRole('dialog', { name: 'Clear Full Body A?' })).getByRole('button', { name: 'Clear session' }));
}

async function showAllEquipment(user: User) {
  const equipmentChip = within(library()).queryByRole('button', { name: 'Remove filter Only her equipment' });
  if (equipmentChip) await user.click(equipmentChip);
}

async function addFromLibrary(user: User, name: string) {
  await showAllEquipment(user);
  await user.click(within(library()).getByRole('button', { name: `Add ${name}` }));
}

function pointAt(element: HTMLElement) {
  Object.assign(document, { elementFromPoint: () => element, elementsFromPoint: () => [element] });
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
    expect(within(day('Saturday')).getByRole('button', { name: 'Full Body A' })).toBeInTheDocument();
    expect(within(day('Monday')).getByText('Rest')).toBeInTheDocument();
  });

  it('expands a session from its day card', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(session('Full Body B')).queryByRole('heading', { name: 'A · Main lift' })).not.toBeInTheDocument();

    // act
    await user.click(within(day('Wednesday')).getByRole('button', { name: 'Full Body B' }));

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
    expect(within(library()).queryByRole('button', { name: /^Remove filter Pattern/ })).not.toBeInTheDocument();

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

  it('edits one set on its own and applies the first working set to all working sets', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));

    // act
    await retype(user, within(main).getByRole('textbox', { name: 'Set 4 reps' }), '6–8');

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 3 reps' })).toHaveValue('12–15');
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 2 sets', 'Working 3 sets, varied']));

    // act
    await user.type(within(main).getByRole('spinbutton', { name: 'Set 3 weight' }), '20');
    await user.click(within(main).getByRole('button', { name: 'Apply to all working sets' }));

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 4 reps' })).toHaveValue('12–15');
    expect(within(main).getByRole('spinbutton', { name: 'Set 5 weight' })).toHaveValue(20);
    expect(within(main).getByRole('textbox', { name: 'Set 1 reps' })).toHaveValue('8');
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 2 sets', 'Working 3 sets × 12–15', 'RIR 3']));
  });

  it('turns a working set into a warm-up set and blanks its RIR', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    const warmUp = within(main).getByRole('checkbox', { name: 'Set 3 is a warm-up set' });
    expect(warmUp).not.toBeChecked();

    // act
    await user.click(warmUp);

    // assert
    expect(within(main).queryByRole('textbox', { name: 'Set 3 RIR' })).not.toBeInTheDocument();
    expect(within(main).getByText('Set 3 RIR: none on a warm-up set')).toBeInTheDocument();
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 3 sets', 'Working 2 sets × 12–15', 'RIR 3']));
  });

  it('leaves the weight empty to pick it by RIR', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);

    // act
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));

    // assert
    const weight = within(main).getByRole('spinbutton', { name: 'Set 3 weight' });
    expect(weight).toHaveValue(null);
    expect(weight).toHaveAttribute('placeholder', 'by RIR');
  });

  it('adds a set like the last one, lets the coach switch its kind and removes one', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Sets for / }));
    const before = within(within(main).getByRole('list', { name: /^Sets for / })).getAllByRole('listitem').length;

    // act
    await user.click(within(main).getByRole('button', { name: 'Add set' }));

    // assert
    const added = `Set ${before + 1}`;
    expect(within(main).getByRole('checkbox', { name: `${added} is a warm-up set` })).not.toBeChecked();
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 2 sets', 'Working 4 sets × 12–15']));

    // act
    await user.click(within(main).getByRole('checkbox', { name: `${added} is a warm-up set` }));
    await user.click(within(main).getByRole('button', { name: 'Add set' }));

    // assert
    expect(within(main).getByRole('checkbox', { name: `Set ${before + 2} is a warm-up set` })).toBeChecked();
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 4 sets', 'Working 3 sets × 12–15']));

    // act
    await user.click(within(main).getByRole('button', { name: `Remove set ${before + 2}` }));

    // assert
    expect(setStats(main)).toEqual(expect.arrayContaining(['Warm-up 3 sets', 'Working 3 sets × 12–15']));
    expect(within(main).queryByRole('button', { name: 'Add warm-up set' })).not.toBeInTheDocument();
  });

  it('keeps rest beside the sets, apart from the set actions', async () => {
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
    expect(within(main).getByRole('button', { name: 'Add set' })).toBeEnabled();
  });

  it('plays the exercise video in a dialog from the details', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Details for / }));
    const trigger = within(main).getByRole('button', { name: /^Watch .+ video$/ });
    const exerciseName = within(main).getByRole('heading', { level: 5 }).textContent?.replace(/^A /, '') ?? '';

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
    expect(within(day('Saturday')).getByText('26 min')).toBeInTheDocument();
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
    const warmUp = within(session('Full Body A')).getByRole('list', { name: 'Warm-up exercises' });
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
    const warmUp = within(session('Full Body A')).getByRole('list', { name: 'Warm-up exercises' });
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
    const stretches = within(session('Full Body A')).getByRole('list', { name: 'Stretches' });
    expect(within(stretches).getByRole('spinbutton', { name: 'Couch Stretch seconds' })).toHaveValue(30);
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
    const [mainName] = within(card(/^A /)).getAllByRole('heading', { level: 5 }).map(heading => (heading.textContent ?? '').replace(/^A /, ''));
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
    expect(setStats(card(/^A /))).toEqual(['Warm-up 2 sets', 'Working 4 sets × 6–10', 'RIR 1–2', 'Rest 2:30']);
  });

  it('estimates the session minutes from what it contains, against the target', async () => {
    // arrange
    const user = await openFirstBlock();
    const estimate = () => within(session('Full Body A')).getByText(/of 60 min$/).textContent;
    expect(estimate()).toBe('~34 of 60 min');

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
    const confirm = screen.getByRole('dialog', { name: 'Change the split?' });
    expect(within(confirm).getByText(/^Full Body A · \d+ exercises$/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(within(day('Monday')).getByRole('button', { name: 'Lower A' })).toBeInTheDocument();
    expect(within(session('Lower A')).getAllByText('Add or drop an exercise')).toHaveLength(4);
  });

  it('asks before fewer training days drop a session and rebuilds the week', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Training days' }));
    await user.click(screen.getByRole('option', { name: '2 days' }));

    // assert
    const confirm = screen.getByRole('dialog', { name: 'Change training days?' });
    expect(within(confirm).getByText(/^Full Body C · \d+ exercises$/)).toBeInTheDocument();

    // act
    await user.click(within(confirm).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(screen.getByRole('combobox', { name: 'Training days' })).toHaveTextContent('2 days');
    expect(within(day('Monday')).getByRole('button', { name: 'Full Body A' })).toBeInTheDocument();
    expect(within(day('Thursday')).getByRole('button', { name: 'Full Body B' })).toBeInTheDocument();
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
    const confirm = screen.getByRole('dialog', { name: 'Make Saturday a rest day?' });
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
    const confirm = screen.getByRole('dialog', { name: 'Make Monday a rest day?' });
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
    expect(within(rounds()).getByText('4 min')).toBeInTheDocument();

    // act
    await retype(user, within(rounds()).getByRole('spinbutton', { name: 'Rounds' }), '5');

    // assert
    expect(within(rounds()).getByText('7 min')).toBeInTheDocument();
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
    const confirm = screen.getByRole('dialog', { name: 'Make Monday a rest day?' });

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
    expect(screen.getByRole('dialog', { name: 'Change training days?' })).toBeInTheDocument();

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
    const warmUp = within(session('Full Body A')).getByRole('list', { name: 'Warm-up exercises' });

    // act
    await retype(user, within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' }), '1');

    // assert
    expect(within(warmUp).getByRole('spinbutton', { name: '90/90 Hip Switches sets' })).toHaveAccessibleDescription('set ×');
  });

  it('asks for the easy time between interval exercises only once there are two', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Add segment to Cardio' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Intervals' }));
    const rounds = () => within(session('Cardio')).getByRole('article', { name: /Intervals/ });
    await user.click(within(rounds()).getByRole('button', { name: 'Add exercise to the intervals' }));

    // act
    await addFromLibrary(user, 'Burpee');

    // assert
    expect(within(rounds()).queryByRole('spinbutton', { name: 'Easy between exercises' })).not.toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Jumping Jacks');

    // assert
    expect(within(rounds()).getByRole('spinbutton', { name: 'Easy between exercises' })).toBeInTheDocument();
  });

  it('clears a cardio session from its header menu after confirmation', async () => {
    // arrange
    const user = await openFirstBlock();
    await openCardioDay(user, 'Easy cardio');

    const cardio = screen.getByRole('textbox', { name: 'Session name' }).closest('article') as HTMLElement;

    // act
    await user.click(within(cardio).getByRole('button', { name: 'Easy cardio actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Clear segments' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Clear Easy cardio?' })).getByRole('button', { name: 'Clear segments' }));

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
    const warmUp = () => within(session('Full Body A')).getByRole('list', { name: 'Warm-up exercises' });
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
