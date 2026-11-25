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

function expectEditorPanelNamedByExistingElements(name: string) {
  const panel = screen.getByRole('tabpanel', { name });
  const labelledBy = (panel.getAttribute('aria-labelledby') ?? '').split(' ').filter(id => id !== '');
  expect(labelledBy.every(id => document.getElementById(id) !== null)).toBe(true);
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
    expect(within(rows[2]).getByRole('spinbutton', { name: 'Weeks of block 3' })).toHaveAccessibleDescription('A deload is always 1 week');
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
    expect(within(rows[3]).getByRole('button', { name: /^Open block 4, Hypertrophy: Full Body\b.*3 of 3 sessions$/ })).toHaveTextContent('3 of 3 sessions');
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

  it('removes an upcoming block with its row remove button once she confirms', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[2]).getByRole('button', { name: 'Remove block 3, Deload' }));
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Remove block 3?' })).getByRole('button', { name: 'Remove block' }));

    // assert
    expect(blockRows()).toHaveLength(2);
  });

  it('lists what a block row removal would lose and keeps the block when she cancels', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    const remove = within(blockRows()[0]).getByRole('button', { name: /^Remove block 1, / });

    // act
    await user.click(remove);
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove block 1?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    // assert
    expect(blockRows()).toHaveLength(3);
    await waitFor(() => expect(remove).toHaveFocus());
  });

  it('moves focus to the next block row after a confirmed removal, else the previous one', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[1]).getByRole('button', { name: /^Remove block 2, / }));
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Remove block 2?' })).getByRole('button', { name: 'Remove block' }));

    // assert
    await waitFor(() => expect(within(blockRows()[1]).getByRole('button', { name: /^Open block 2, / })).toHaveFocus());

    // act
    await user.click(within(blockRows()[1]).getByRole('button', { name: /^Remove block 2, / }));
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Remove block 2?' })).getByRole('button', { name: 'Remove block' }));

    // assert
    await waitFor(() => expect(within(blockRows()[0]).getByRole('button', { name: /^Open block 1, / })).toHaveFocus());
  });

  it('moves focus to the place heading once the last block is removed and again after using the suggestion', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    for (const position of [3, 2]) {
      await user.click(within(blockRows()[position - 1]).getByRole('button', { name: new RegExp(`^Remove block ${position}, `) }));
      await user.click(within(await screen.findByRole('alertdialog', { name: `Remove block ${position}?` })).getByRole('button', { name: 'Remove block' }));
    }

    // act
    await user.click(within(blockRows()[0]).getByRole('button', { name: /^Remove block 1, / }));
    await user.click(within(await screen.findByRole('alertdialog', { name: 'Remove block 1?' })).getByRole('button', { name: 'Remove block' }));

    // assert
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveFocus());

    // act
    await user.click(screen.getByRole('button', { name: 'Use suggestion' }));

    // assert
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveFocus());
    expect(blockRows().length).toBeGreaterThan(0);
  });

  it('opens a block from its row', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[1]).getByRole('button', { name: /^Open block 2, Hypertrophy: Full Body\b.*3 of 3 sessions$/ }));

    // assert
    expect(await screen.findByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
  });

  it('names the dated check-in forms on the timeline from day 1', async () => {
    // arrange
    const dayOne = subDays(new Date(), 1);
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));

    // assert
    const firstForm = firstCheckInFormAfter(dayOne);
    const weeks = within(screen.getByRole('toolbar', { name: 'Plan weeks' })).getAllByRole('button');
    expect(weeks.filter(week => week.getAttribute('aria-label')?.includes(`check-in form ${format(firstForm, 'EEE d MMM')}`))).toHaveLength(1);
  });

  it('reviews the warnings from the top bar without opening the publish dialog', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: /^\d+ things? worth a look$/ }));

    // assert
    const review = screen.getByRole('dialog', { name: 'Review the draft' });
    expect(within(review).getByRole('heading', { name: 'Worth a look' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Publish version 1' })).not.toBeInTheDocument();
  });

  it('opens the block a reviewed warning concerns', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: /^\d+ things? worth a look$/ }));

    // act
    await user.click(within(screen.getByRole('dialog', { name: 'Review the draft' })).getByRole('button', { name: /is trained on fewer than 2 days$/ }));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Review the draft' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /^Block \d · / })).toBeInTheDocument();
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
    const confirm = screen.getByRole('alertdialog', { name: 'Remove block 3?' });
    expect(within(confirm).getAllByText(/ · \d+ exercises?$/).length).toBeGreaterThan(0);
    await user.click(within(confirm).getByRole('button', { name: 'Remove block' }));

    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    expect(blockRows()).toHaveLength(2);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveFocus());
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
    expect(within(dialog).getByRole('tablist', { name: /^Days of week \d+ of \d+$/ })).toBeInTheDocument();
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
    await user.click(within(screen.getByRole('alertdialog', { name: 'Change the split?' })).getByRole('button', { name: 'Rebuild sessions' }));

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

  it('counts blocking problems in the top bar and lists them in the review', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(within(blockRows()[1]).getByRole('combobox', { name: 'Type of block 2' }));
    await user.click(screen.getByRole('option', { name: 'Foundation' }));

    // act
    await user.click(screen.getByRole('button', { name: '1 problem to fix before publishing' }));

    // assert
    const review = screen.getByRole('dialog', { name: 'Review the draft' });
    expect(within(review).getByRole('heading', { name: 'Before you can publish' })).toBeInTheDocument();
    expect(within(review).getByRole('button', { name: 'Foundation must be the first block' })).toBeInTheDocument();
  });

  it('shows the editor skeleton while the program loads', () => {
    // arrange
    const search = '&pseed=draft&jstage=approved&pload=loading';

    // act
    renderProgramEditor(search);

    // assert
    expect(screen.getByRole('status')).toHaveTextContent('Loading the program editor');
    expect(screen.getByRole('main', { name: 'Program editor' })).toContainElement(screen.getByRole('heading', { level: 1, name: 'Program editor' }));
    expect(screen.getByRole('link', { name: 'Back to Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');
  });

  it('offers a retry when the program could not be loaded', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved&pload=failed');
    expect(screen.getByRole('main', { name: 'Program editor' })).toContainElement(screen.getByRole('heading', { level: 1, name: "The program couldn't be loaded" }));
    expect(screen.getByRole('link', { name: 'Back to Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');

    // act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
  });

  it('leads to the program setup when the client has no program yet', () => {
    // arrange
    const search = '&pseed=none&jstage=approved';

    // act
    renderProgramEditor(search);

    // assert
    expect(screen.getByRole('main', { name: 'Program editor' })).toContainElement(screen.getByRole('heading', { level: 1, name: 'No program yet' }));
    expect(screen.getByRole('link', { name: 'Back to Jane Doe' })).toHaveAttribute('href', '/coach/clients/c1');
    expect(screen.getByRole('link', { name: 'Set up program' })).toHaveAttribute('href', '/coach/clients/c1/program/new');
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
  it('names the editor panel by the Structure tab beside it', () => {
    // arrange
    // act
    renderProgramEditor('&pseed=draft&jstage=approved');

    // assert
    expectEditorPanelNamedByExistingElements('Structure');
  });
});

describe('ProgramEditorPage on a phone', () => {
  it('names the editor panel while the outline with its tabs is closed', () => {
    // arrange
    stubPhoneViewport();

    // act
    renderProgramEditor('&pseed=draft&jstage=approved');

    // assert
    expect(screen.queryByRole('tablist', { name: 'Editing mode' })).not.toBeInTheDocument();
    expectEditorPanelNamedByExistingElements('Structure');
  });

  it('opens the outline as a modal sheet and keeps the rest out of reach', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    expect(screen.queryByRole('complementary', { name: 'Program outline' })).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'Program outline' });
    expect(sheet).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Program sections', hidden: true })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('main', { name: 'Program editor' })).not.toBeInTheDocument();
  });

  it('returns focus to the outline toggle after switching mode in the sheet', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // act
    await user.click(within(screen.getByRole('dialog', { name: 'Program outline' })).getByRole('tab', { name: 'Texts' }));

    // assert
    await waitFor(() => expect(screen.getByRole('button', { name: 'Program sections' })).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Program outline' })).not.toBeInTheDocument();
    expect(document.title).toBe('Texts · Overview · Jane Doe · Evoa');
  });

  it('returns focus to the outline toggle after choosing a section in the sheet', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy/ }));

    // assert
    await waitFor(() => expect(screen.getByRole('button', { name: 'Program sections' })).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Program outline' })).not.toBeInTheDocument();
    expect(document.title).toBe('Structure · Block 2 · Hypertrophy · Jane Doe · Evoa');
  });

  it('closes the outline sheet on Escape with focus back on its toggle', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Program sections' }));

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.getByRole('button', { name: 'Program sections' })).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Program outline' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Program sections' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns focus to the draft actions after the client profile opened from them closes', async () => {
    // arrange
    stubPhoneViewport();
    const user = renderProgramEditor('&pseed=draft&jstage=approved');
    await user.click(screen.getByRole('button', { name: 'Draft actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Client profile' }));
    expect(screen.getByRole('dialog', { name: 'Jane Doe' })).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.getByRole('button', { name: 'Draft actions' })).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Jane Doe' })).not.toBeInTheDocument();
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

