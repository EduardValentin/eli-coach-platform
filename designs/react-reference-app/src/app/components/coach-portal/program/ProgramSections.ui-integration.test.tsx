import { screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

const TEXTS_PATH = '/coach/clients/c1/program/draft/texts';

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function main(): HTMLElement {
  return screen.getByRole('main');
}

function programDocument(): HTMLElement {
  return within(main()).getByRole('article', { name: / program$/ });
}

describe('program structure sections', () => {
  it('lists the structure, then the texts as the last step, without client text sections', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jgender=female');

    // assert
    const entries = within(rail()).getAllByRole('button').map(button => button.textContent);
    expect(entries.at(-1)).toMatch(/^Texts/);
    expect(within(rail()).getByRole('button', { name: 'Setup' })).toBeInTheDocument();
    for (const removed of ['Intro & setup', 'Nutrition', 'Lifestyle', 'Client guide']) {
      expect(within(rail()).queryByRole('button', { name: removed })).not.toBeInTheDocument();
    }
    expect(within(rail()).queryByRole('button', { name: /cycle/i })).not.toBeInTheDocument();
  });

  it('keeps only coach settings in the setup and locks the language after the first publication', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Setup' }));

    // assert
    expect(within(main()).getByRole('combobox', { name: 'Level' })).toBeInTheDocument();
    expect(within(main()).getByRole('combobox', { name: 'Language' })).toBeDisabled();
    expect(within(main()).queryByText('Fixed after the first publication')).not.toBeInTheDocument();
    expect(within(main()).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('keeps client texts out of a block', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(main()).queryByRole('button', { name: 'Texts the client reads' })).not.toBeInTheDocument();
    expect(within(main()).queryByText(/1,000–2,000 per version/)).not.toBeInTheDocument();
  });

  it('continues from the overview to the texts and back to a block in one click each', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(main()).getByRole('link', { name: 'Continue to texts' }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^Texts/ })).toHaveAttribute('aria-current', 'true');
    expect(programDocument()).toBeInTheDocument();

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
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
});

describe('texts page', () => {
  it('renders the program document for editing inside the builder chrome', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // assert
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Texts')).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^Texts/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview as client' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' })).toHaveValue('');
    expect(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('region', { name: 'Nutrition' })).toBeInTheDocument();
  });

  it('writes an empty text in place, shows it as it prints and opens it again', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // act
    await user.type(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' }), 'Own the squat pattern');
    await user.click(within(programDocument()).getByRole('button', { name: 'Done editing Focus until the next check-in' }));

    // assert
    expect(within(programDocument()).queryByRole('textbox', { name: 'Focus until the next check-in' })).not.toBeInTheDocument();
    expect(within(programDocument()).getByText('Own the squat pattern')).toBeInTheDocument();
    const edit = within(programDocument()).getByRole('button', { name: 'Edit Focus until the next check-in' });
    expect(edit).toHaveFocus();

    // act
    await user.click(edit);

    // assert
    const field = within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' });
    expect(field).toHaveFocus();
    expect(field).toHaveValue('Own the squat pattern');

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(within(programDocument()).getByRole('button', { name: 'Edit Focus until the next check-in' })).toHaveFocus();
  });

  it('keeps written texts on the draft across the structure and back', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await user.type(within(programDocument()).getByRole('textbox', { name: 'Personal note' }), 'So glad to start with you');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    await user.click(within(rail()).getByRole('button', { name: /^Texts/ }));

    // assert
    expect(within(programDocument()).getByText('So glad to start with you')).toBeInTheDocument();
    expect(within(programDocument()).queryByRole('textbox', { name: 'Personal note' })).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));

    // assert
    expect(within(screen.getByRole('dialog', { name: 'Preview as client' })).getByText('So glad to start with you')).toBeInTheDocument();
  });

  it("shows the coach's edited guide text to the client and resets it to the standard text", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft', TEXTS_PATH);
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' }));
    const legend = within(programDocument()).getByRole('textbox', { name: 'How to read your session' });
    expect(within(programDocument()).queryByRole('button', { name: 'Reset to standard text' })).not.toBeInTheDocument();

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
    await user.click(within(programDocument()).getByRole('button', { name: 'Reset to standard text' }));

    // assert
    expect(within(programDocument()).getByRole('textbox', { name: 'How to read your session' })).toHaveDisplayValue(/\*\*A, B, C\*\*/);
  });

  it('writes the texts of the block chosen above the document', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // act
    await user.click(screen.getByRole('tab', { name: /2 Hypertrophy/ }));
    await user.type(within(programDocument()).getByRole('textbox', { name: 'Note for this block' }), 'Time to add weight');

    // assert
    expect(within(programDocument()).getByRole('heading', { name: /^Hypertrophy block/ })).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('tab', { name: /1 Foundation/ }));

    // assert
    expect(within(programDocument()).getByRole('textbox', { name: 'Note for this block' })).toHaveValue('');
  });

  it("marks a Romanian program's standard texts as pending", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: 'Setup' }));
    await user.click(within(main()).getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'Romanian' }));

    // act
    await user.click(within(rail()).getByRole('button', { name: /^Texts/ }));
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit Block intro' }));

    // assert
    expect(within(programDocument()).getByText('Romanian text pending')).toBeInTheDocument();
  });
});
