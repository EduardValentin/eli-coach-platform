import { screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function main(): HTMLElement {
  return screen.getByRole('main');
}

describe('program-wide sections', () => {
  it('requires what changed from version 2', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    const checklist = screen.getByRole('region', { name: 'Before you can publish' });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(within(checklist).getByText('Say what changed and why')).toBeInTheDocument();
    await user.click(within(rail()).getByRole('button', { name: 'Header & focus' }));

    // act
    await user.type(within(main()).getByRole('textbox', { name: /What changed and why/ }), 'Raised the squat volume');

    // assert
    expect(screen.queryByText('Say what changed and why')).not.toBeInTheDocument();
  });

  it('hides cycle rules in general mode', () => {
    // arrange / act
    renderProgramEditor('&jgender=male&pseed=draft');

    // assert
    expect(within(rail()).getByRole('button', { name: 'Nutrition' })).toBeInTheDocument();
    expect(within(rail()).queryByRole('button', { name: 'Cycle rules' })).not.toBeInTheDocument();
  });

  it("marks a Romanian program's texts as pending", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: 'Header & focus' }));
    await user.click(within(main()).getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'Romanian' }));

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    await user.click(within(main()).getByRole('button', { name: 'Texts the client reads' }));

    // assert
    const intro = within(main()).getByRole('group', { name: 'Intro' });
    expect(within(intro).getByText('Romanian text pending')).toBeInTheDocument();
  });

  it('adds a cardio session to the block and the calendar offers it', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    const table = within(main()).getByRole('table', { name: 'Cardio sessions' });
    const before = within(table).getAllByRole('row').length;

    // act
    await user.click(within(main()).getByRole('button', { name: 'Add cardio session' }));

    // assert
    expect(within(table).getAllByRole('row')).toHaveLength(before + 1);
    expect(within(main()).getByText(/min of cardio this week · WHO suggests 150–300 min moderate/)).toBeInTheDocument();
    await user.click(within(main()).getByRole('combobox', { name: 'Monday' }));
    expect(screen.getAllByRole('option', { name: 'LISS 30 min' })).toHaveLength(3);
  });

  it('refreshes the intensity text when the cardio type changes', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    const table = within(main()).getByRole('table', { name: 'Cardio sessions' });
    const [, first] = within(table).getAllByRole('row');

    // act
    await user.click(within(first).getByRole('combobox', { name: 'Type of cardio 1' }));
    await user.click(screen.getByRole('option', { name: 'HIIT' }));

    // assert
    expect(within(first).getByRole('textbox', { name: 'Intensity of cardio 1' })).toHaveValue('Hard: only a few words at a time');
  });

  it('keeps a coach-edited intensity text when the cardio type changes', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    const table = within(main()).getByRole('table', { name: 'Cardio sessions' });
    const [, first] = within(table).getAllByRole('row');
    const intensity = within(first).getByRole('textbox', { name: 'Intensity of cardio 1' });
    await user.type(intensity, '!');

    // act
    await user.click(within(first).getByRole('combobox', { name: 'Type of cardio 1' }));
    await user.click(screen.getByRole('option', { name: 'HIIT' }));

    // assert
    expect(intensity).toHaveValue('You can hold a conversation!');
  });

  it('removes a cardio session and clears its calendar day', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    const table = within(main()).getByRole('table', { name: 'Cardio sessions' });
    const week = within(main()).getByRole('group', { name: 'Week' });
    const restDays = () => within(week).getAllByRole('combobox').filter(day => day.textContent === 'Rest').length;
    const before = { rows: within(table).getAllByRole('row').length, restDays: restDays() };

    // act
    await user.click(within(table).getByRole('button', { name: 'Remove cardio 1' }));

    // assert
    expect(within(table).getAllByRole('row')).toHaveLength(before.rows - 1);
    expect(restDays()).toBe(before.restDays + 1);
  });

  it('moving a cardio session to another weekday updates the calendar', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    const week = within(main()).getByRole('group', { name: 'Week' });
    const table = within(main()).getByRole('table', { name: 'Cardio sessions' });
    const cardioDay = within(table).getByRole('combobox', { name: 'Weekday of cardio 1' });
    expect(cardioDay).toHaveTextContent('Tuesday');
    expect(within(week).getByRole('combobox', { name: 'Tuesday' })).toHaveTextContent('LISS 30 min');

    // act
    await user.click(cardioDay);
    await user.click(screen.getByRole('option', { name: 'Saturday' }));

    // assert
    expect(within(week).getByRole('combobox', { name: 'Tuesday' })).toHaveTextContent('Rest');
    expect(within(week).getByRole('combobox', { name: 'Saturday' })).toHaveTextContent('LISS 30 min');
  });

  it('prefills one cycle rule per declared symptom', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jgender=female');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Cycle rules' }));

    // assert
    expect(within(main()).getAllByRole('textbox', { name: /^Symptom period/ }).length).toBeGreaterThan(0);
  });

  it('writes nutrition guidance', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: 'Nutrition' }));

    // act
    await user.type(within(main()).getByRole('textbox', { name: 'Nutrition guidance' }), 'Protein at every meal');

    // assert
    expect(within(main()).getByRole('textbox', { name: 'Nutrition guidance' })).toHaveValue('Protein at every meal');
    expect(within(main()).getByText('Meal plan — designed in the next round')).toBeInTheDocument();
  });
});
