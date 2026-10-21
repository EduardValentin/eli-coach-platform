import { screen, within } from '@testing-library/react';
import { addDays, format, getDay, startOfDay, subDays } from 'date-fns';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
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
    expect(screen.getByRole('heading', { level: 1, name: /v1 draft/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).toHaveAttribute('aria-current', 'true');
    expect(within(breadcrumb()).getByText('Overview')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    const summary = screen.getByRole('list', { name: 'Plan summary' });
    expect(within(summary).getByText('11 weeks')).toBeInTheDocument();
    expect(within(summary).getByText('Starts on publication')).toBeInTheDocument();
    const rows = blockRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('combobox', { name: 'Type of block 1' })).toHaveTextContent('Foundation');
    expect(within(rows[1]).getByRole('combobox', { name: 'Type of block 2' })).toHaveTextContent('Hypertrophy');
    expect(within(rows[2]).getByRole('combobox', { name: 'Type of block 3' })).toHaveTextContent('Deload');
    expect(within(rail()).getByRole('button', { name: /^1 Foundation 4 wk · 3\/3/ })).toBeInTheDocument();
  });

  it('selects a block from the rail and returns through the breadcrumb', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy 6 wk/ }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy 6 wk/ })).toHaveAttribute('aria-current', 'true');
    expect(within(rail()).getByRole('button', { name: /^Overview/ })).not.toHaveAttribute('aria-current');
    expect(within(breadcrumb()).getByText('Block 2 · Hypertrophy')).toHaveAttribute('aria-current', 'page');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
    expect(within(main).getByRole('region', { name: 'Week' })).toBeInTheDocument();
    await user.click(within(breadcrumb()).getByRole('button', { name: 'Overview' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
  });

  it('refuses a block duration below the weeks already run', async () => {
    // arrange
    const realNow = new Date();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(subDays(realNow, 15));
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    vi.useRealTimers();
    expect(within(rail()).getByRole('button', { name: /^1 Foundation 4 wk/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: /^Overview/ }));
    const weeks = within(blockRows()[0]).getByRole('spinbutton', { name: 'Weeks of block 1' });

    // act
    await user.clear(weeks);
    await user.type(weeks, '1');

    // assert
    expect(screen.getByText('This block has already run 2 weeks')).toBeInTheDocument();
    expect(weeks).toHaveValue(4);
    expect(within(rail()).getByRole('button', { name: /^1 Foundation 4 wk/ })).toBeInTheDocument();
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
    expect(within(rail()).getByRole('button', { name: /^4 Hypertrophy 4 wk/ })).toHaveAttribute('aria-current', 'true');
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
    expect(screen.getByRole('status')).toHaveTextContent('Hypertrophy block moved to position 1 of 3');
    expect(within(rail()).getByRole('button', { name: /^1 Hypertrophy 6 wk/ })).toBeInTheDocument();
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

  it('opens a block from its row actions', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(blockRows()[1]).getByRole('button', { name: 'Block 2 actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Open' }));

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
    expect(within(screen.getByRole('list', { name: 'Plan summary' })).getByText(`Next check-in form ${format(firstForm, 'd MMMM')}`)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Plan summary' })).getByText(`Starts ${format(dayOne, 'd MMMM')}`)).toBeInTheDocument();
  });

  it('opens the checklist on the warnings from the top bar', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(screen.getByRole('button', { name: /^\d+ things? worth a look$/ }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'Publish checklist' });
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
    expect(within(dialog).getByText('Current focus')).toBeInTheDocument();
  });
});
