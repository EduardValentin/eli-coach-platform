import { screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';
import { clearRichText, writeRichText } from '../../../../test/richText';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

const TEXTS_PATH = '/coach/clients/c1/program/draft/texts';

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function breadcrumb(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Breadcrumb' });
}

function main(): HTMLElement {
  return screen.getByRole('main');
}

function programDocument(): HTMLElement {
  return within(main()).getByRole('article', { name: / program$/ });
}

describe('program structure sections', () => {
  it('switches between structure and texts at the top of a rail with the same overview and blocks', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jgender=female');
    const modes = screen.getByRole('navigation', { name: 'Editing mode' });
    expect(within(modes).getByRole('link', { name: 'Structure' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^1 Foundation 4 wk · 3\/3/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: 'Add block' })).toBeInTheDocument();
    for (const removed of ['Setup', 'Intro & setup', 'Nutrition', 'Lifestyle', 'Client guide']) {
      expect(within(rail()).queryByRole('button', { name: removed })).not.toBeInTheDocument();
    }
    expect(within(rail()).queryByRole('button', { name: /cycle/i })).not.toBeInTheDocument();

    // act
    await user.click(within(modes).getByRole('link', { name: 'Texts' }));

    // assert
    expect(within(screen.getByRole('navigation', { name: 'Editing mode' })).getByRole('link', { name: 'Texts' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveTextContent(/\d+ of \d+ texts written/);
    expect(within(rail()).getByRole('button', { name: /^1 Foundation \d+ of \d+ texts written$/ })).toBeInTheDocument();
    expect(within(rail()).queryByRole('button', { name: 'Add block' })).not.toBeInTheDocument();
  });

  it('keeps the place when switching between structure and texts', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));

    // act
    await user.click(screen.getByRole('link', { name: 'Texts' }));

    // assert
    expect(within(breadcrumb()).getByText('Texts')).toBeInTheDocument();
    expect(within(breadcrumb()).getByText('Block 2 · Hypertrophy')).toHaveAttribute('aria-current', 'page');
    expect(within(programDocument()).getByRole('heading', { name: /^Hypertrophy block/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveAttribute('aria-current', 'true');

    // act
    await user.click(screen.getByRole('link', { name: 'Structure' }));

    // assert
    expect(within(breadcrumb()).getByText('Structure')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
  });

  it('sets the level and language on the overview and locks the language after the first publication', () => {
    // arrange / act
    renderProgramEditor('&pseed=two-versions&jstage=program-ready#plan');

    // assert
    const settings = within(main()).getByRole('group', { name: 'Program settings' });
    expect(within(settings).getByRole('combobox', { name: 'Level' })).toBeInTheDocument();
    expect(within(settings).getByRole('combobox', { name: 'Language' })).toBeDisabled();
    expect(within(main()).queryByText('Fixed after the first publication')).not.toBeInTheDocument();
  });

  it('falls back to the overview from an old setup address', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved#setup');

    // assert
    expect(within(breadcrumb()).getByText('Overview')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps client texts out of a block and continues to the texts only after the last block', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    expect(within(main()).queryByRole('link', { name: 'Continue to texts' })).not.toBeInTheDocument();
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    expect(within(main()).queryByRole('button', { name: 'Texts the client reads' })).not.toBeInTheDocument();
    expect(within(main()).queryByRole('link', { name: 'Continue to texts' })).not.toBeInTheDocument();
    await user.click(within(rail()).getByRole('button', { name: /^3 Deload/ }));

    // act
    await user.click(within(main()).getByRole('link', { name: 'Continue to texts' }));

    // assert
    expect(within(breadcrumb()).getByText('Texts')).toBeInTheDocument();
    expect(within(breadcrumb()).getByText('Overview')).toHaveAttribute('aria-current', 'page');
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' })).toBeInTheDocument();
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
    expect(within(breadcrumb()).getByText('Texts')).toBeInTheDocument();
    expect(within(breadcrumb()).getByText('Overview')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Texts' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview as client' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' })).toHaveTextContent(/^$/);
    expect(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('region', { name: 'Nutrition' })).toBeInTheDocument();
    expect(within(programDocument()).queryByRole('textbox', { name: 'Note for this block' })).not.toBeInTheDocument();
  });

  it('writes an empty text in place, shows it as it prints and opens it again', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // act
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' }), 'Own the squat pattern');
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
    expect(field).toHaveTextContent('Own the squat pattern');

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(within(programDocument()).getByRole('button', { name: 'Edit Focus until the next check-in' })).toHaveFocus();
  });

  it('keeps written texts on the draft across the structure and back', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'Personal note' }), 'So glad to start with you');

    // act
    await user.click(screen.getByRole('link', { name: 'Structure' }));
    await user.click(screen.getByRole('link', { name: 'Texts' }));

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
    await clearRichText(user, legend);
    await writeRichText(user, legend, 'Do the exercises in order, A first.');
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));
    const preview = screen.getByRole('dialog', { name: 'Preview as client' });
    await user.click(within(preview).getByRole('button', { name: 'How to read your session' }));

    // assert
    expect(within(preview).getByText('Do the exercises in order, A first.')).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');
    await user.click(within(programDocument()).getByRole('button', { name: 'Reset to standard text' }));

    // assert
    const reset = within(programDocument()).getByRole('textbox', { name: 'How to read your session' });
    expect(reset).toHaveTextContent(/^How to read your session/);
    expect(within(reset).getByText('A, B, C')).toBeInTheDocument();
    expect(reset).not.toHaveTextContent('**');
  });

  it('writes the texts of the block chosen in the rail and counts them there', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));
    const slots = within(programDocument()).getAllByRole('textbox').length + within(programDocument()).getAllByRole('button', { name: /^Edit / }).length;
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveTextContent(`${slots - 1} of ${slots} texts written`);

    // act
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'Note for this block' }), 'Time to add weight');

    // assert
    expect(within(programDocument()).getByRole('heading', { name: /^Hypertrophy block/ })).toBeInTheDocument();
    expect(within(programDocument()).queryByText('Program · Version 1 · Draft')).not.toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveTextContent(`${slots} of ${slots} texts written`);

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(programDocument()).getByRole('heading', { name: /^Foundation block/ })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'Note for this block' })).toHaveTextContent(/^$/);
  });

  it('offers only the formatting each text prints', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // assert
    const toolsOf = (name: string) => {
      const toolbar = within(programDocument()).queryByRole('group', { name: `Formatting for ${name}` });
      return toolbar ? within(toolbar).getAllByRole('button').map(button => button.getAttribute('aria-label')) : [];
    };
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in' })).toBeInTheDocument();
    expect(toolsOf('Focus until the next check-in')).toEqual([]);
    expect(toolsOf('Personal note')).toEqual(['Bold', 'Italic', 'Bulleted list']);
    expect(toolsOf('Nutrition')).toEqual(['Heading', 'Bold', 'Italic', 'Bulleted list']);
  });

  it("marks a Romanian program's standard texts as pending", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    await user.click(within(main()).getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'Romanian' }));

    // act
    await user.click(screen.getByRole('link', { name: 'Texts' }));
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit Block intro' }));

    // assert
    expect(within(programDocument()).getByText('Romanian text pending')).toBeInTheDocument();
  });
});
