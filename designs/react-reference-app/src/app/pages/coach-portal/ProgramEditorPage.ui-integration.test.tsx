import { screen, waitFor, within } from '@testing-library/react';
import { addDays, format, getDay, startOfDay, subDays } from 'date-fns';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis, stubPhoneViewport } from '../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  stubEditorBrowserApis();
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

const MONDAY = 1;

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function breadcrumb(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Breadcrumb' });
}

function blockRows(): HTMLElement[] {
  return within(within(screen.getByRole('main')).getByRole('list', { name: 'Blocks' })).getAllByRole('listitem');
}

function firstCheckInFormAfter(dayOne: Date): Date {
  let day = addDays(startOfDay(dayOne), 14);
  while (getDay(day) !== MONDAY) day = addDays(day, 1);
  return day;
}

describe('ProgramEditorPage', () => {
  it('opens on the overview for version 1 with three suggested blocks', () => {
    // arrange
    const search = '&pseed=draft&jstage=approved';

    // act
    renderProgramEditor(search);

    // assert
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe · v1 draft')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    expect(document.title).toBe('Structure · Overview · Jane Doe · Evoa');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Plan summary' })).not.toBeInTheDocument();
    const rows = blockRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('combobox', { name: 'Type of block 1' })).toHaveTextContent('Foundation');
    expect(within(rows[1]).getByRole('combobox', { name: 'Type of block 2' })).toHaveTextContent('Hypertrophy');
    expect(within(rows[2]).getByRole('combobox', { name: 'Type of block 3' })).toHaveTextContent('Deload');
    expect(within(rail()).getByRole('button', { name: '1 Foundation weeks 1–4' })).toBeInTheDocument();
  });

  it('selects a block from the rail and returns through the breadcrumb', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ })).toHaveAttribute('aria-current', 'true');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).not.toHaveAttribute('aria-current');
    expect(within(breadcrumb()).getByRole('heading', { level: 1, name: 'Block 2 · Hypertrophy' }).closest('li')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Structure · Block 2 · Hypertrophy · Jane Doe · Evoa');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
    expect(within(main).getByRole('region', { name: 'Week' })).toBeInTheDocument();
    await user.click(within(breadcrumb()).getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
  });

  it('refuses a block duration below the weeks already run', async () => {
    // arrange
    const realNow = new Date();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(subDays(realNow, 15));
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    vi.useRealTimers();
    expect(within(rail()).getByRole('button', { name: /^1 Foundation/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    const weeks = within(blockRows()[0]).getByRole('spinbutton', { name: 'Weeks of block 1' });

    // act
    await user.clear(weeks);
    await user.type(weeks, '1');

    // assert
    expect(screen.getByText('This block has already run 2 weeks')).toBeInTheDocument();
    expect(weeks).toHaveValue(4);
    expect(within(rail()).getByRole('button', { name: /^1 Foundation/ })).toBeInTheDocument();
  });

  it('adds a block after the last one with the previous sessions', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: 'Add block' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a block' });
    expect(within(dialog).getByRole('combobox', { name: 'Type' })).toHaveTextContent('Hypertrophy');
    expect(within(dialog).getByRole('spinbutton', { name: 'Weeks' })).toHaveValue(4);
    await user.click(within(dialog).getByRole('button', { name: 'Add block' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Add a block' })).not.toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^4 Hypertrophy/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Block 4 · Hypertrophy' })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Hypertrophy block added as block 4'));
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    const rows = blockRows();
    expect(rows).toHaveLength(4);
    expect(within(rows[3]).getByText('3 of 3 sessions')).toBeInTheDocument();
  });

  it('moves a block up with the arrow key on its reorder handle', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    const handle = within(blockRows()[1]).getByRole('button', { name: 'Reorder Hypertrophy block' });
    handle.focus();

    // act
    await user.keyboard('{ArrowUp}');

    // assert
    const rows = blockRows();
    expect(within(rows[0]).getByRole('combobox', { name: 'Type of block 1' })).toHaveTextContent('Hypertrophy');
    expect(within(rows[1]).getByRole('combobox', { name: 'Type of block 2' })).toHaveTextContent('Foundation');
    expect(within(rows[0]).getByRole('button', { name: 'Reorder Hypertrophy block' })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Hypertrophy block moved to position 1 of 3'));
    expect(within(rail()).getByRole('button', { name: /^1 Hypertrophy/ })).toBeInTheDocument();
  });

  it('removes an upcoming block from its row actions', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[2]).getByRole('button', { name: 'Block 3 actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));

    // assert
    expect(blockRows()).toHaveLength(2);
  });

  it('opens a block from its sessions count', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[1]).getByRole('button', { name: 'Open block 2, 3 of 3 sessions' }));

    // assert
    expect(await screen.findByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
  });

  it('places dated check-in form chips on the timeline from day 1', async () => {
    // arrange
    const dayOne = subDays(new Date(), 1);
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));

    // assert
    const firstForm = firstCheckInFormAfter(dayOne);
    const chips = within(screen.getByRole('list', { name: 'Check-in forms' })).getAllByRole('listitem');
    expect(chips[0]).toHaveTextContent(format(firstForm, 'd MMM'));
  });

  it('opens the publish dialog on the warnings from the top bar', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: /^\d+ things? worth a look$/ }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'Publish version 1' });
    expect(within(sheet).getByRole('heading', { name: 'Worth a look' })).toBeInTheDocument();
  });

  it('shows the block header with a calibration switch and the block actions', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // act
    await user.click(screen.getByRole('button', { name: 'Block actions' }));

    // assert
    expect(screen.getByRole('switch', { name: 'Calibration week' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Daily steps' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Copy from another client…',
      'Reset to split',
      'Remove block',
    ]);
    expect(screen.queryByRole('button', { name: 'Copy from another client' })).not.toBeInTheDocument();
  });

  it('removes the open block from the block actions and returns to the overview', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(rail()).getByRole('button', { name: /^3 Deload/ }));

    // act
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove block' }));
    const confirm = screen.getByRole('dialog', { name: 'Remove block 3?' });
    expect(within(confirm).getAllByText(/ · \d+ exercises?$/).length).toBeGreaterThan(0);
    await user.click(within(confirm).getByRole('button', { name: 'Remove block' }));

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    expect(blockRows()).toHaveLength(2);
  });

  it('keeps the current block from being removed', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(screen.getByRole('button', { name: 'Block actions' }));

    // assert
    expect(screen.getByRole('menuitem', { name: 'Remove block' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('discards the draft after confirmation and returns to the program page', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(screen.getByRole('button', { name: 'Draft actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Discard draft' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard this draft?' });
    expect(within(dialog).getByText('Everything you changed since version 2 is lost.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Discard draft' }));

    // assert
    expect(screen.getByText('Program page')).toBeInTheDocument();
  });

  it('discards a first draft and returns to the client page', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Draft actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Discard draft' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Discard this draft?' })).getByRole('button', { name: 'Discard draft' }),
    );

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });

  it('previews the draft as the client sees it in a dialog', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));

    // assert
    const dialog = screen.getByRole('dialog', { name: 'Preview as client' });
    expect(within(dialog).getByRole('tablist', { name: 'This week' })).toBeInTheDocument();
  });

  it('offers a skip link to the editor before the top bar', () => {
    // arrange / act
    renderProgramEditor('&pseed=draft&jstage=approved');

    // assert
    const skip = screen.getByRole('link', { name: 'Skip to editor' });
    expect(skip).toHaveAttribute('href', '#editor');
    expect(screen.getByRole('main', { name: 'Program editor' })).toHaveAttribute('id', 'editor');
    expect(skip.compareDocumentPosition(screen.getByRole('link', { name: 'Back to Jane Doe' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: 'Editor' })).getByRole('link', { name: 'Back to Jane Doe' })).toBeInTheDocument();
  });

  it('adds a block from the row under the block list and explains the fixed Deload length', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Add block' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a block' });
    await user.click(within(dialog).getByRole('combobox', { name: 'Type' }));
    await user.click(screen.getByRole('option', { name: 'Deload' }));

    // assert
    expect(within(dialog).getByRole('spinbutton', { name: 'Weeks' })).toHaveAccessibleDescription('A Deload lasts one week');
  });

  it('names only the dates of a complete block in the rail and flags empty sessions', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    expect(within(rail()).getByRole('button', { name: '2 Hypertrophy weeks 5–10' })).toBeInTheDocument();
    await user.click(within(rail()).getByRole('button', { name: /^1 Foundation/ }));

    // act
    await user.click(screen.getByRole('combobox', { name: 'Split' }));
    await user.click(screen.getByRole('option', { name: 'Upper / Lower' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Change the split?' })).getByRole('button', { name: 'Rebuild sessions' }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^1 Foundation weeks 1–4 \d+ sessions? empty$/ })).toBeInTheDocument();
  });

  it('puts a plan problem under the block it names and marks it in the rail', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    const type = within(blockRows()[1]).getByRole('combobox', { name: 'Type of block 2' });

    // act
    await user.click(type);
    await user.click(screen.getByRole('option', { name: 'Foundation' }));

    // assert
    const typeAfter = within(blockRows()[1]).getByRole('combobox', { name: 'Type of block 2' });
    expect(typeAfter).toHaveAccessibleDescription('Foundation must be the first block');
    expect(typeAfter).toHaveAttribute('aria-invalid', 'true');
    expect(within(rail()).getByRole('button', { name: /^2 Foundation has a problem/ })).toBeInTheDocument();
  });

  it('counts blocking problems in the top bar and opens the publish dialog at them', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(blockRows()[1]).getByRole('combobox', { name: 'Type of block 2' }));
    await user.click(screen.getByRole('option', { name: 'Foundation' }));

    // act
    await user.click(screen.getByRole('button', { name: '1 problem to fix before publishing' }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'Publish version 1' });
    expect(within(sheet).getByRole('heading', { name: 'Before you can publish' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
  });

  it('says why the language is fixed once a version is published', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));

    // act
    await user.hover(screen.getByRole('button', { name: 'Why the language is fixed' }));

    // assert
    expect(await screen.findByText('Fixed once a version is published')).toBeInTheDocument();
  });

  it('keeps the draft and says so when discarding fails', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready&pwrite=fails');
    await user.click(screen.getByRole('button', { name: 'Draft actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Discard draft' }));
    const dialog = screen.getByRole('dialog', { name: 'Discard this draft?' });

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Discard draft' }));

    // assert
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The draft wasn’t discarded and nothing changed. Try again.');
    expect(screen.queryByText('Program page')).not.toBeInTheDocument();
  });

  it('opens the client preview with focus on its close button', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Preview as client' }));

    // assert
    expect(within(screen.getByRole('dialog', { name: 'Preview as client' })).getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});

describe('ProgramEditorPage on a phone', () => {
  it('opens the outline as a modal drawer and keeps the rest out of reach', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    const outline = screen.getByRole('complementary', { hidden: true, name: 'Program outline' });
    expect(outline).toHaveAttribute('inert');

    // act
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // assert
    const drawer = screen.getByRole('dialog', { name: 'Program outline' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(drawer).not.toHaveAttribute('inert');
    expect(document.getElementById('editor')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Close program sections' })).toHaveFocus();
  });

  it('returns focus to the outline toggle after switching mode in the drawer', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // act
    await user.click(within(screen.getByRole('dialog', { name: 'Program outline' })).getByRole('link', { name: 'Texts' }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Program outline' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Program sections' })).toHaveFocus();
    expect(document.title).toBe('Texts · Overview · Jane Doe · Evoa');
  });

  it('moves the preview and the client profile into the draft actions', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: 'Draft actions' }));

    // assert
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Preview as client', 'Client profile', 'Discard draft']);
  });
});

