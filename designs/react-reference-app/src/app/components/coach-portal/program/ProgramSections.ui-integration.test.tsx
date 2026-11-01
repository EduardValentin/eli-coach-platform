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
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));

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
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));
    await user.click(within(main()).getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'Romanian' }));

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    await user.click(within(main()).getByRole('button', { name: 'Texts the client reads' }));

    // assert
    const intro = within(main()).getByRole('article', { name: /^Intro/ });
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
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));

    // assert
    expect(within(main()).getByRole('combobox', { name: 'Language' })).toBeDisabled();
    expect(within(main()).queryByText('Fixed after the first publication')).not.toBeInTheDocument();
  });

  it("shows the coach's edited guide text to the client and resets it to the template", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: 'Client guide' }));
    const legend = within(main()).getByRole('textbox', { name: 'How to read your session' });

    // act
    await user.clear(legend);
    await user.type(legend, 'Do the exercises in order, A first.');
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));
    const preview = screen.getByRole('dialog', { name: 'Preview as client' });
    await user.click(within(preview).getByRole('button', { name: 'How to read your session' }));

    // assert
    expect(within(preview).getByText('Do the exercises in order, A first.')).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');
    await user.click(within(main()).getAllByRole('button', { name: 'Reset to template' })[0]);

    // assert
    expect(within(main()).getByRole('textbox', { name: 'How to read your session' })).toHaveDisplayValue(/\*\*A, B, C\*\*/);
  });

  it('lists the cycle adjustments the coach set under listening to your cycle', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jgender=female');
    await user.click(within(rail()).getByRole('button', { name: 'Cycle rules' }));
    const [period] = within(main()).getAllByRole('textbox', { name: /^Symptom period/ });
    await user.clear(period);
    await user.type(period, 'Cramps, days 1–2');

    // act
    await user.click(within(main()).getByRole('combobox', { name: 'Adjustment 1' }));
    await user.click(screen.getByRole('option', { name: 'RIR +1' }));
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));
    const preview = screen.getByRole('dialog', { name: 'Preview as client' });
    await user.click(within(preview).getByRole('button', { name: 'Listening to your cycle' }));

    // assert
    const adjustments = within(preview).getByRole('list', { name: 'Your adjustments' });
    expect(within(adjustments).getByRole('listitem')).toHaveTextContent('Cramps, days 1–2: stop each set 1 rep earlier than usual');
  });

  it('shows the focus, the personal note and the missed-day note to the client', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));

    // act
    await user.type(within(main()).getByRole('textbox', { name: /Focus until the next check-in form/ }), 'Own the squat pattern');
    await user.type(within(main()).getByRole('textbox', { name: /Personal note/ }), 'So glad to start with you');
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));
    const preview = screen.getByRole('dialog', { name: 'Preview as client' });
    await user.click(within(preview).getByRole('button', { name: 'About this block' }));

    // assert
    expect(within(preview).getByText('Own the squat pattern')).toBeInTheDocument();
    expect(within(preview).getByText('So glad to start with you')).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: 'If you miss a session' })).toBeInTheDocument();
  });
});
