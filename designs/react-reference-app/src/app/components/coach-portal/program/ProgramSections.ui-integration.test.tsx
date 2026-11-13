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

  it('keeps the publish notes out of the intro section', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));

    // assert
    expect(within(main()).getByRole('textbox', { name: /Personal note/ })).toBeInTheDocument();
    expect(within(main()).queryByRole('textbox', { name: /Focus until the next check-in form/ })).not.toBeInTheDocument();
    expect(within(main()).queryByRole('textbox', { name: /What changed and why/ })).not.toBeInTheDocument();
  });

  it('leaves the cycle out of the program sections', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jgender=female');

    // assert
    expect(within(rail()).getByRole('button', { name: 'Nutrition' })).toBeInTheDocument();
    expect(within(rail()).queryByRole('button', { name: /cycle/i })).not.toBeInTheDocument();
  });

  it('shows the client profile from the top bar and returns focus when it closes', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    const trigger = screen.getByRole('button', { name: 'Client profile' });

    // act
    await user.click(trigger);

    // assert
    const profile = screen.getByRole('dialog');
    expect(within(profile).getByText('Goal')).toBeInTheDocument();
    expect(within(profile).getByText('Days per week')).toBeInTheDocument();
    expect(within(main()).queryByText('Days per week')).not.toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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

  it('shows the focus, the personal note and the missed-day note to the client', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const publish = screen.getByRole('dialog', { name: 'Publish version 1' });
    await user.type(within(publish).getByRole('textbox', { name: /Focus until the next check-in form/ }), 'Own the squat pattern');
    await user.click(within(publish).getByRole('button', { name: 'Keep editing' }));
    await user.click(within(rail()).getByRole('button', { name: 'Intro & setup' }));

    // act
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
