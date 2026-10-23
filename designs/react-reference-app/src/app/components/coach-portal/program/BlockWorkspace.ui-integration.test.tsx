import { fireEvent, screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';

type User = ReturnType<typeof userEvent.setup>;

beforeEach(stubEditorBrowserApis);

afterEach(() => {
  Reflect.deleteProperty(document, 'elementFromPoint');
  Reflect.deleteProperty(document, 'elementsFromPoint');
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

async function openFirstBlock() {
  const user = renderProgramEditor('&pseed=draft&jstage=approved');
  await user.click(within(screen.getByRole('navigation', { name: 'Program sections' })).getByRole('button', { name: /^1 Foundation 4 wk/ }));
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

async function addFromLibrary(user: User, name: string) {
  const equipmentFilter = within(library()).getByRole('switch', { name: 'Only her equipment' });
  if (equipmentFilter.getAttribute('aria-checked') === 'true') await user.click(equipmentFilter);
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
    await user.click(within(slotGroup('B · Secondary')).getByRole('button', { name: 'Add exercise to Secondary' }));
    expect(within(library()).getByText('Adding to Full Body A · Secondary')).toBeInTheDocument();
    expect(within(library()).getByRole('button', { name: /^Pattern, 2 selected/ })).toBeInTheDocument();

    // act
    await addFromLibrary(user, 'Romanian Deadlift');

    // assert
    expect(within(slotGroup('B · Secondary')).getByRole('article', { name: 'B Romanian Deadlift' })).toBeInTheDocument();
    expect(within(slotGroup('A · Main lift')).getByText('Drop an exercise here')).toBeInTheDocument();
    expect(within(library()).queryByText(/^Adding to/)).not.toBeInTheDocument();
  });

  it('drags a library exercise into an empty group', async () => {
    // arrange
    const user = await openFirstBlock();
    await clearFirstSession(user);
    await user.click(within(library()).getByRole('switch', { name: 'Only her equipment' }));
    const source = within(library()).getByRole('button', { name: 'Add Lateral Raises' }).closest('li')?.firstElementChild as HTMLElement;
    const target = within(slotGroup('C · Accessories')).getByText('Drop an exercise here').parentElement as HTMLElement;
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
      await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Add exercise to Accessories' }));
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
    await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Ungroup' }));

    // assert
    expect(positions()).toEqual(['C', 'C']);
  });

  it('edits one set on its own and applies the first working set to all working sets', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: 'Sets' }));

    // act
    await retype(user, within(main).getByRole('textbox', { name: 'Set 4 reps' }), '6–8');

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 3 reps' })).toHaveValue('12–15');
    expect(within(main).getByText('2 warm-up · 3 sets')).toBeInTheDocument();

    // act
    await user.type(within(main).getByRole('spinbutton', { name: 'Set 3 weight' }), '20');
    await user.click(within(main).getByRole('button', { name: 'Apply to all working sets' }));

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 4 reps' })).toHaveValue('12–15');
    expect(within(main).getByRole('spinbutton', { name: 'Set 5 weight' })).toHaveValue(20);
    expect(within(main).getByRole('textbox', { name: 'Set 1 reps' })).toHaveValue('8');
    expect(within(main).getByText('2 warm-up · 3 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('turns a working set into a warm-up set and blanks its RIR', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: 'Sets' }));
    const kind = within(main).getByRole('group', { name: 'Set 3 kind' });

    // act
    await user.click(within(kind).getByRole('radio', { name: 'Warm-up' }));

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 3 RIR' })).toBeDisabled();
    expect(within(main).getByRole('textbox', { name: 'Set 3 RIR' })).toHaveValue('');
    expect(within(main).getByText('3 warm-up · 2 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('leaves the weight empty to pick it by RIR', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);

    // act
    await user.click(within(main).getByRole('button', { name: 'Sets' }));

    // assert
    const weight = within(main).getByRole('spinbutton', { name: 'Set 3 weight' });
    expect(weight).toHaveValue(null);
    expect(weight).toHaveAttribute('placeholder', 'by RIR');
  });

  it('adds warm-up and working sets and removes one', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: 'Sets' }));

    // act
    await user.click(within(main).getByRole('button', { name: 'Add warm-up set' }));
    await user.click(within(main).getByRole('button', { name: 'Add working set' }));
    await user.click(within(main).getByRole('button', { name: 'Remove set 4' }));

    // assert
    expect(within(main).getByText('3 warm-up · 3 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('plays the exercise video in a dialog from the details', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: /^Details for / }));
    const trigger = within(main).getByRole('button', { name: 'Watch video' });
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
    expect(within(built).getAllByRole('article').map(segment => within(segment).getAllByText(/^(Steady|Rounds)$/)[0].textContent)).toEqual([
      'Steady',
      'Rounds',
      'Steady',
    ]);
    expect(within(day('Saturday')).getByText('26 min')).toBeInTheDocument();
  });

  it('edits a steady segment and adds rounds', async () => {
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
    await user.click(within(cardio).getByRole('button', { name: 'Add segment' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rounds' }));

    // assert
    expect(within(cardio).getAllByRole('article')).toHaveLength(2);
    expect(within(within(cardio).getByRole('article', { name: /Rounds/ })).getByRole('button', { name: 'Add exercise' })).toBeInTheDocument();
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
    expect(within(library()).getByText('Adding to Moderate cardio')).toBeInTheDocument();
    expect(within(library()).getByRole('radio', { name: 'Cardio' })).toBeChecked();

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
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add warm-up exercise' }));

    // assert
    expect(within(library()).getByRole('radio', { name: 'Mobility' })).toBeChecked();
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

  it('reveals the cool-down note and a stretch list once the cool-down is on', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(session('Full Body A')).queryByRole('textbox', { name: 'Cool-down note' })).not.toBeInTheDocument();

    // act
    await user.click(within(session('Full Body A')).getByRole('switch', { name: 'Cool-down' }));

    // assert
    const note = within(session('Full Body A')).getByRole('textbox', { name: 'Cool-down note' });
    expect(note).toHaveAttribute('placeholder', 'Easy walk and a few stretches');

    // act
    await user.type(note, 'Walk for five minutes');
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add stretch' }));

    // assert
    expect(within(library()).getByRole('radio', { name: 'Stretching' })).toBeChecked();

    // act
    await addFromLibrary(user, 'Couch Stretch');

    // assert
    expect(note).toHaveValue('Walk for five minutes');
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

  it('moves a card down through its menu', async () => {
    // arrange
    const user = await openFirstBlock();
    const [mainName] = within(card(/^A /)).getAllByRole('heading', { level: 5 }).map(heading => heading.textContent ?? '');

    // act
    await user.click(within(card(/^A /)).getByRole('button', { name: /actions$/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move down' }));

    // assert
    expect(card(/^B /)).toHaveAccessibleName(mainName.replace(/^A /, 'B '));
  });

  it('changing the block type refills untouched values', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Block type' }));
    await user.click(screen.getByRole('option', { name: 'Hypertrophy' }));

    // assert
    expect(within(card(/^A /)).getByText('2 warm-up · 4 × 6–10 · RIR 1–2')).toBeInTheDocument();
    expect(within(card(/^A /)).getByText('Rest 2:30')).toBeInTheDocument();
  });

  it('shows the estimated minutes against the target', async () => {
    // arrange / act
    await openFirstBlock();

    // assert
    expect(within(session('Full Body A')).getByText('~38 min · target 60')).toBeInTheDocument();
  });

  it('rebuilds the sessions from a new split shape after confirmation', async () => {
    // arrange
    const user = await openFirstBlock();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Split shape' }));
    await user.click(screen.getByRole('option', { name: 'Upper / Lower' }));
    const confirm = screen.getByRole('dialog', { name: 'Change the split?' });
    expect(within(confirm).getByText(/^Full Body A · \d+ exercises$/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(within(day('Monday')).getByRole('button', { name: 'Lower A' })).toBeInTheDocument();
    expect(within(session('Lower A')).getAllByText('Drop an exercise here')).toHaveLength(4);
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

  it('builds rounds from cardio and conditioning exercises and shows their minutes', async () => {
    // arrange
    const user = await openFirstBlock();
    await chooseInDayMenu(user, 'Saturday', 'Cardio');
    await user.click(within(day('Saturday')).getByRole('button', { name: 'Cardio' }));
    await user.click(within(session('Cardio')).getByRole('button', { name: 'Add segment' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rounds' }));
    const rounds = () => within(session('Cardio')).getByRole('article', { name: /Rounds/ });

    // act
    await user.click(within(rounds()).getByRole('button', { name: 'Add exercise' }));

    // assert
    expect(within(library()).getByRole('radio', { name: 'Cardio' })).toBeChecked();
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
