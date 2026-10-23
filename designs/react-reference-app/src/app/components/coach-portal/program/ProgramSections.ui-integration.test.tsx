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
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const checklist = screen.getByRole('dialog', { name: 'Publish checklist' });
    expect(within(checklist).getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(within(checklist).getByText('Say what changed and why')).toBeInTheDocument();
    await user.click(within(checklist).getByRole('button', { name: 'Keep editing' }));
    await user.click(within(rail()).getByRole('button', { name: 'Header & focus' }));

    // act
    await user.type(within(main()).getByRole('textbox', { name: /What changed and why/ }), 'Raised the squat volume');

    // assert
    await user.click(screen.getByRole('button', { name: 'Publish' }));
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
    expect(within(main()).queryByText(/Until then/)).not.toBeInTheDocument();
  });

  it('shows no notes explaining the editor', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(main()).queryByText(/1,000–2,000 per version/)).not.toBeInTheDocument();

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Lifestyle' }));

    // assert
    expect(within(main()).queryByText(/Sleep, stress/)).not.toBeInTheDocument();
  });

  it('locks the language after the first publication without a note', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Header & focus' }));

    // assert
    expect(within(main()).getByRole('combobox', { name: 'Language' })).toBeDisabled();
    expect(within(main()).queryByText('Fixed after the first publication')).not.toBeInTheDocument();
  });
});
