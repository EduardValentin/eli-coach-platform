import { screen, within } from '@testing-library/react';
import { subDays } from 'date-fns';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../test/renderProgramEditor';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

function rail(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Program sections' });
}

function planTable(): HTMLElement {
  return screen.getByRole('table', { name: 'Blocks' });
}

describe('ProgramEditorPage', () => {
  it('opens on the plan overview for version 1 with three suggested blocks', () => {
    // arrange
    const search = '&pseed=draft&jstage=approved';

    // act
    renderProgramEditor(search);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: /v1 draft/ })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: 'Plan overview' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Plan overview' })).toBeInTheDocument();
    const rows = within(planTable()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('combobox', { name: 'Type of block 1' })).toHaveTextContent('Foundation');
    expect(within(rows[1]).getByRole('combobox', { name: 'Type of block 2' })).toHaveTextContent('Hypertrophy');
    expect(within(rows[2]).getByRole('combobox', { name: 'Type of block 3' })).toHaveTextContent('Deload');
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toBeInTheDocument();
  });

  it('selects a block from the rail and shows it as current', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=draft&jstage=approved');

    // act
    await user.click(within(rail()).getByRole('button', { name: /^2 Hypertrophy · 6 wk/ }));

    // assert
    expect(within(rail()).getByRole('button', { name: /^2 Hypertrophy · 6 wk/ })).toHaveAttribute('aria-current', 'true');
    expect(within(rail()).getByRole('button', { name: 'Plan overview' })).not.toHaveAttribute('aria-current');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 2, name: 'Hypertrophy' })).toBeInTheDocument();
    expect(within(main).getByRole('list', { name: 'Sessions' })).toBeInTheDocument();
  });

  it('refuses a block duration below the weeks already run', async () => {
    // arrange
    const realNow = new Date();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(subDays(realNow, 15));
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');
    vi.useRealTimers();
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: 'Plan overview' }));
    const weeks = within(planTable()).getByRole('spinbutton', { name: 'Weeks of block 1' });

    // act
    await user.clear(weeks);
    await user.type(weeks, '1');

    // assert
    expect(screen.getByText('This block has already run 2 weeks')).toBeInTheDocument();
    expect(weeks).toHaveValue(4);
    expect(within(rail()).getByRole('button', { name: /^1 Foundation · 4 wk/ })).toBeInTheDocument();
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
    expect(within(rail()).getByRole('button', { name: /^4 Hypertrophy · 4 wk/ })).toHaveAttribute('aria-current', 'true');
    await user.click(within(rail()).getByRole('button', { name: 'Plan overview' }));
    const rows = within(planTable()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[3]).getByText('3 of 3 filled')).toBeInTheDocument();
  });

  it('discards the draft after confirmation and returns to the program page', async () => {
    // arrange
    const user = renderProgramEditor('&pseed=two-versions&jstage=program-ready');

    // act
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
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
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Discard this draft?' })).getByRole('button', { name: 'Discard draft' }),
    );

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });
});
