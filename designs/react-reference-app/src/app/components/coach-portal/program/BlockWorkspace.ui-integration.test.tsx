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
  it('turns a rest day into easy cardio and rests it again', async () => {
    // arrange
    const user = await openFirstBlock();
    expect(within(day('Saturday')).getByText('Rest')).toBeInTheDocument();

    // act
    await chooseInDayMenu(user, 'Saturday', 'Cardio');

    // assert
    expect(within(day('Saturday')).getByText('Easy cardio')).toBeInTheDocument();
    expect(within(day('Saturday')).getByText('30 min')).toBeInTheDocument();

    // act
    await chooseInDayMenu(user, 'Saturday', 'Rest');

    // assert
    expect(within(day('Saturday')).getByText('Rest')).toBeInTheDocument();
    expect(within(day('Saturday')).queryByText('Easy cardio')).not.toBeInTheDocument();
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
    for (const name of ['Lateral Raises', 'Biceps Curl']) {
      await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Add exercise to Accessories' }));
      await addFromLibrary(user, name);
    }
    expect(positions()).toEqual(['C', 'C']);

    // act
    await user.click(within(card(/Lateral Raises$/)).getByRole('button', { name: 'Lateral Raises actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Superset with next' }));

    // assert
    expect(positions()).toEqual(['C1', 'C2']);
    expect(within(slotGroup('C · Accessories')).getByText('Superset')).toBeInTheDocument();

    // act
    await user.click(within(slotGroup('C · Accessories')).getByRole('button', { name: 'Ungroup' }));

    // assert
    expect(positions()).toEqual(['C', 'C']);
  });

  it('edits one set on its own and applies set 1 to all', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: 'Sets' }));

    // act
    await retype(user, within(main).getByRole('textbox', { name: 'Set 2 reps' }), '6–8');

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 1 reps' })).toHaveValue('12–15');
    expect(within(main).getByText('2 warm-up · 3 sets')).toBeInTheDocument();

    // act
    await user.click(within(main).getByRole('button', { name: 'Apply set 1 to all' }));

    // assert
    expect(within(main).getByRole('textbox', { name: 'Set 2 reps' })).toHaveValue('12–15');
    expect(within(main).getByRole('textbox', { name: 'Warm-up 1 reps' })).toHaveValue('8');
    expect(within(main).getByText('2 warm-up · 3 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('adds and removes a set', async () => {
    // arrange
    const user = await openFirstBlock();
    const main = card(/^A /);
    await user.click(within(main).getByRole('button', { name: 'Sets' }));

    // act
    await user.click(within(main).getByRole('button', { name: 'Add set' }));
    await user.click(within(main).getByRole('button', { name: 'Remove set 1' }));

    // assert
    expect(within(main).getAllByRole('textbox', { name: /^Set \d reps$/ })).toHaveLength(3);
    expect(within(main).getByText('2 warm-up · 3 × 12–15 · RIR 3')).toBeInTheDocument();
  });

  it('adds a mobility exercise to the warm-up and removes its chip', async () => {
    // arrange
    const user = await openFirstBlock();
    await user.click(within(session('Full Body A')).getByRole('button', { name: 'Add mobility exercise' }));
    expect(within(library()).getByRole('radio', { name: 'Mobility' })).toBeChecked();
    await addFromLibrary(user, '90/90 Hip Switches');
    const warmUp = within(session('Full Body A')).getByRole('group', { name: 'Warm-up' });
    expect(within(warmUp).getByText('90/90 Hip Switches')).toBeInTheDocument();

    // act
    await user.click(within(warmUp).getByRole('button', { name: 'Remove 90/90 Hip Switches' }));

    // assert
    expect(within(warmUp).queryByText('90/90 Hip Switches')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('option', { name: 'Upper / lower' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Replace the sessions?' })).getByRole('button', { name: 'Replace sessions' }));

    // assert
    expect(within(day('Monday')).getByRole('button', { name: 'Lower A' })).toBeInTheDocument();
    expect(within(session('Lower A')).getAllByText('Drop an exercise here')).toHaveLength(4);
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
