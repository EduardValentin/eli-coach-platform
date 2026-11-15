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
    expect(within(rail()).getByRole('button', { name: '1 Foundation weeks 1–4' })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: 'Add block' })).toBeInTheDocument();
    for (const removed of ['Setup', 'Intro & setup', 'Nutrition', 'Lifestyle', 'Client guide']) {
      expect(within(rail()).queryByRole('button', { name: removed })).not.toBeInTheDocument();
    }
    expect(within(rail()).queryByRole('button', { name: /cycle/i })).not.toBeInTheDocument();

    // act
    await user.click(within(modes).getByRole('link', { name: 'Texts' }));

    // assert
    expect(within(screen.getByRole('navigation', { name: 'Editing mode' })).getByRole('link', { name: 'Texts' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveTextContent('All texts ready');
    expect(within(rail()).getByRole('button', { name: /^1 Foundation All texts ready$/ })).toBeInTheDocument();
    expect(within(rail()).queryByRole('button', { name: 'Add block' })).not.toBeInTheDocument();
  });

  it('keeps the place when switching between structure and texts', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));

    // act
    await user.click(screen.getByRole('link', { name: 'Texts' }));

    // assert
    expect(document.title).toBe('Texts · Block 2 · Hypertrophy · Jane Doe · Evoa');
    expect(within(breadcrumb()).getByRole('heading', { level: 1, name: 'Block 2 · Hypertrophy' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('heading', { name: /^Hypertrophy block/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveAttribute('aria-current', 'true');

    // act
    await user.click(screen.getByRole('link', { name: 'Structure' }));

    // assert
    expect(document.title).toBe('Structure · Block 2 · Hypertrophy · Jane Doe · Evoa');
    expect(screen.getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
  });

  it('sets the level and language on the overview and locks the language after the first publication', () => {
    // arrange / act
    renderProgramEditor('&pseed=two-versions&jstage=program-ready#plan');

    // assert
    const settings = within(main()).getByRole('group', { name: 'Program settings' });
    expect(within(settings).getByRole('combobox', { name: 'Level' })).toBeInTheDocument();
    expect(within(settings).queryByRole('combobox', { name: 'Language' })).not.toBeInTheDocument();
    expect(within(settings).getByText('English')).toBeInTheDocument();
    expect(within(settings).getByRole('button', { name: 'Why the language is fixed' })).toBeInTheDocument();
  });

  it('falls back to the overview from an old setup address', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved#setup');

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
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
    expect(document.title).toBe('Texts · Overview · Jane Doe · Evoa');
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in (optional)' })).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Texts' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview as client' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exercise library' })).not.toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in (optional)' })).toHaveTextContent(/^$/);
    expect(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('region', { name: 'Nutrition' })).toBeInTheDocument();
    expect(within(programDocument()).queryByRole('textbox', { name: /^A note from Eli/ })).toBeInTheDocument();
    expect(within(programDocument()).queryByRole('textbox', { name: 'Note for this block' })).not.toBeInTheDocument();
  });

  it('nests the program-wide pages under the cover and the block pages straight under the page heading', async () => {
    // arrange / act
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // assert
    expect(within(programDocument()).getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('heading', { level: 3, name: 'How to read your session' })).toBeInTheDocument();

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(programDocument()).getByRole('heading', { level: 2, name: /^Foundation block/ })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('heading', { level: 2, name: 'Calendar' })).toBeInTheDocument();
    expect(within(programDocument()).queryByRole('heading', { level: 3, name: 'Calendar' })).not.toBeInTheDocument();
  });

  it('labels an empty text with its printed heading and marks it optional', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // assert
    const heading = within(programDocument()).getByRole('heading', { level: 3, name: 'Nutrition (optional)' });
    expect(within(programDocument()).getByRole('textbox', { name: 'Nutrition (optional)' })).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(programDocument()).getByRole('textbox', { name: 'A note from Eli (optional)' })).toBeInTheDocument();
  });

  it('writes an empty text in place, shows it as it prints and opens it again', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // act
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'Focus until the next check-in (optional)' }), 'Own the squat pattern');
    await user.click(within(programDocument()).getByRole('button', { name: 'Done editing Focus until the next check-in' }));

    // assert
    expect(within(programDocument()).queryByRole('textbox', { name: /^Focus until the next check-in/ })).not.toBeInTheDocument();
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

  it('shows an empty text at rest as its heading and field only', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);

    // assert
    const nutrition = within(programDocument()).getByRole('region', { name: 'Nutrition' });
    expect(within(nutrition).getByRole('heading', { name: 'Nutrition (optional)' })).toBeInTheDocument();
    expect(within(nutrition).getByRole('textbox', { name: 'Nutrition (optional)' })).toBeInTheDocument();
    expect(within(nutrition).queryByRole('toolbar')).not.toBeInTheDocument();
    expect(within(nutrition).queryByRole('button')).not.toBeInTheDocument();
  });

  it('closes an empty text on Done or Escape, leaving focus on its heading', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    const nutrition = within(programDocument()).getByRole('textbox', { name: 'Nutrition (optional)' });
    const heading = within(programDocument()).getByRole('heading', { name: 'Nutrition (optional)' });
    await user.click(nutrition);
    expect(within(programDocument()).getByRole('toolbar', { name: 'Formatting for Nutrition' })).toBeInTheDocument();

    // act
    await user.click(within(programDocument()).getByRole('button', { name: 'Done editing Nutrition' }));

    // assert
    expect(heading).toHaveFocus();
    expect(within(programDocument()).queryByRole('toolbar', { name: 'Formatting for Nutrition' })).not.toBeInTheDocument();
    expect(within(programDocument()).queryByRole('button', { name: 'Done editing Nutrition' })).not.toBeInTheDocument();

    // act
    await user.click(nutrition);
    await user.keyboard('{Escape}');

    // assert
    expect(heading).toHaveFocus();
    expect(within(programDocument()).queryByRole('button', { name: 'Done editing Nutrition' })).not.toBeInTheDocument();

    // act
    await user.tab();

    // assert
    expect(nutrition).toHaveFocus();
    expect(within(programDocument()).getByRole('button', { name: 'Done editing Nutrition' })).toBeInTheDocument();
  });

  it('reaches the formatting toolbar in one tab stop after the text and moves inside it with the arrow keys', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await user.click(within(programDocument()).getByRole('textbox', { name: 'Nutrition (optional)' }));

    // act
    await user.tab();

    // assert
    const toolbar = within(programDocument()).getByRole('toolbar', { name: 'Formatting for Nutrition' });
    expect(within(toolbar).getByRole('button', { name: 'Heading' })).toHaveFocus();

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveFocus();
    expect(within(toolbar).getAllByRole('button').filter(button => button.tabIndex === 0)).toEqual([within(toolbar).getByRole('button', { name: 'Bold' })]);

    // act
    await user.keyboard('{End}');
    await user.tab();

    // assert
    expect(within(programDocument()).getByRole('button', { name: 'Done editing Nutrition' })).toHaveFocus();
  });

  it('closes an open written text when focus leaves it', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' }));
    expect(within(programDocument()).getByRole('textbox', { name: 'How to read your session' })).toHaveFocus();

    // act
    await user.click(within(programDocument()).getByRole('textbox', { name: 'Nutrition (optional)' }));

    // assert
    expect(within(programDocument()).queryByRole('textbox', { name: 'How to read your session' })).not.toBeInTheDocument();
    expect(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' })).toBeInTheDocument();
  });

  it('keeps written texts on the draft across the structure and back', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'A note from Eli (optional)' }), 'So glad to start with you');

    // act
    await user.click(screen.getByRole('link', { name: 'Structure' }));
    await user.click(screen.getByRole('link', { name: 'Texts' }));

    // assert
    expect(within(programDocument()).getByText('So glad to start with you')).toBeInTheDocument();
    expect(within(programDocument()).getByRole('button', { name: 'Edit Note from Eli' })).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));

    // assert
    expect(within(screen.getByRole('dialog', { name: 'Preview as client' })).getByText('So glad to start with you')).toBeInTheDocument();
  });

  it("shows the coach's edited guide text to the client, resets it to the standard text and undoes the reset", async () => {
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
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' }));
    await user.click(within(programDocument()).getByRole('button', { name: 'Reset to standard text' }));

    // assert
    const reset = within(programDocument()).getByRole('textbox', { name: 'How to read your session' });
    expect(reset).toHaveTextContent(/^How to read your session/);
    expect(within(reset).getByText('A, B, C')).toBeInTheDocument();
    expect(reset).not.toHaveTextContent('**');
    expect(reset).toHaveFocus();

    // act
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    // assert
    expect(within(programDocument()).getByText('Do the exercises in order, A first.')).toBeInTheDocument();
    expect(within(programDocument()).getByRole('button', { name: 'Edit How to read your session' })).toHaveFocus();
  });

  it('counts in the rail only the texts still to write', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveTextContent('All texts ready');
    expect(within(programDocument()).getByRole('textbox', { name: 'A note from Eli (optional)' })).toHaveTextContent(/^$/);

    // act
    await user.click(within(programDocument()).getByRole('button', { name: 'Edit Split text' }));
    await clearRichText(user, within(programDocument()).getByRole('textbox', { name: 'Split text' }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveTextContent('1 to write');

    // act
    await writeRichText(user, within(programDocument()).getByRole('textbox', { name: 'A note from Eli (optional)' }), 'Time to add weight');

    // assert
    expect(within(programDocument()).getByRole('heading', { name: /^Hypertrophy block/ })).toBeInTheDocument();
    expect(within(programDocument()).queryByText('Program · Version 1 · Draft')).not.toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveTextContent('1 to write');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(programDocument()).getByRole('heading', { name: /^Foundation block/ })).toBeInTheDocument();
    expect(within(programDocument()).getByRole('textbox', { name: 'A note from Eli (optional)' })).toHaveTextContent(/^$/);
  });

  it('offers only the formatting each text prints', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved', TEXTS_PATH);
    const toolsOf = async (field: string, name: string) => {
      await user.click(within(programDocument()).getByRole('textbox', { name: field }));
      const toolbar = within(programDocument()).queryByRole('toolbar', { name: `Formatting for ${name}` });
      return toolbar ? within(toolbar).getAllByRole('button').map(button => button.getAttribute('aria-label')) : [];
    };

    // act
    const focus = await toolsOf('Focus until the next check-in (optional)', 'Focus until the next check-in');
    const note = await toolsOf('A note from Eli (optional)', 'Note from Eli');
    const nutrition = await toolsOf('Nutrition (optional)', 'Nutrition');

    // assert
    expect(focus).toEqual([]);
    expect(note).toEqual(['Bold', 'Italic', 'Bulleted list']);
    expect(nutrition).toEqual(['Heading', 'Bold', 'Italic', 'Bulleted list']);
  });

  it("marks a Romanian program's standard texts as pending and counts them in the rail", async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft');
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    await user.click(within(main()).getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'Romanian' }));

    // act
    await user.click(screen.getByRole('link', { name: 'Texts' }));
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^1 Foundation/ })).toHaveTextContent(/^1 Foundation \d+ need Romanian$/);
    const edit = within(programDocument()).getByRole('button', { name: 'Edit Block intro' });
    expect(within(edit.parentElement as HTMLElement).getByRole('button', { name: 'Romanian text pending' })).toBeInTheDocument();

    // act
    await user.click(edit);

    // assert
    const intro = within(programDocument()).getByRole('textbox', { name: 'Block intro' });
    expect(intro).toHaveAccessibleDescription('Romanian text pending');

    // act
    await clearRichText(user, intro);
    await writeRichText(user, intro, 'Bine ai venit');

    // assert
    expect(intro).not.toHaveAccessibleDescription('Romanian text pending');
  });
});
