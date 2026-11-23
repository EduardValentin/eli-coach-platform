import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderProgramEditor, stubEditorBrowserApis } from '../../../../test/renderProgramEditor';
import { useAppState } from '../../../context/AppContext';
import { DEMO_JOURNEY_CALL_ID } from '../../../context/ClientJourneyContext';
import { usePrograms } from '../../../context/ProgramContext';
import { BLOCK_TYPE_LABELS, draftOf } from '../../../domain/program';

beforeAll(stubEditorBrowserApis);

afterEach(() => {
  stubEditorBrowserApis();
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

const SAVE_WAIT = { timeout: 3000 };
const RETRY_INTERVAL_MS = 15_000;
const FAILED_SAVE_COPY = 'Your latest changes aren’t saved yet. They’re still here, and saving keeps trying.';
const DRAFT_LINE = 'Jane Doe · v1 draft';

function StoredPlan() {
  const { programFor } = usePrograms();
  const program = programFor(DEMO_JOURNEY_CALL_ID);
  const blocks = (program && draftOf(program)?.content.plan.blocks) ?? [];
  return <p>Stored plan: {blocks.map(block => BLOCK_TYPE_LABELS[block.type]).join(', ')}</p>;
}

function DraftSavesSwitch() {
  const { setAppState } = useAppState();
  return (
    <>
      <button type="button" onClick={() => setAppState({ draftSave: 'works' })}>
        Let draft saves work
      </button>
      <button type="button" onClick={() => setAppState({ draftSave: 'stale' })}>
        Refuse draft saves as changed elsewhere
      </button>
    </>
  );
}

function renderBuilder(draftSaves: 'works' | 'fails' | 'stale', user: UserEvent = userEvent.setup()): UserEvent {
  renderProgramEditor(`&pseed=draft&jstage=approved&pdraft=${draftSaves}`, {
    beside: (
      <>
        <StoredPlan />
        <DraftSavesSwitch />
      </>
    ),
  });
  return user;
}

function blockTypesOnScreen(): string[] {
  const blocks = within(screen.getByRole('main')).getByRole('list', { name: 'Blocks' });
  return within(blocks)
    .getAllByRole('combobox', { name: /^Type of block/ })
    .map(type => type.textContent ?? '');
}

async function moveHypertrophyFirst(user: UserEvent) {
  within(screen.getByRole('main')).getByRole('button', { name: 'Reorder Hypertrophy block' }).focus();
  await user.keyboard('{ArrowUp}');
}

function draftLine(): HTMLElement {
  return screen.getByText(text => text.startsWith(DRAFT_LINE));
}

function announcer(): HTMLElement {
  return screen.getByRole('status');
}

async function failedSaveAlert(): Promise<HTMLElement> {
  return screen.findByRole('alert', undefined, SAVE_WAIT);
}

function closingTheTabIsWarned(): boolean {
  const closing = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(closing);
  return closing.defaultPrevented;
}

describe('saving the draft in the builder', () => {
  it('says Saving… from the first change and Saved once the draft is saved, without announcing either', async () => {
    // arrange
    const user = renderBuilder('works');
    expect(draftLine()).toHaveTextContent(new RegExp(`^${DRAFT_LINE}$`));

    // act
    await moveHypertrophyFirst(user);

    // assert
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saving…`);
    expect(screen.getByText('Stored plan: Foundation, Hypertrophy, Deload')).toBeInTheDocument();
    await screen.findByText('Stored plan: Hypertrophy, Foundation, Deload', undefined, SAVE_WAIT);
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`);
    expect(announcer()).not.toHaveTextContent(/sav/i);
  });

  it('saves a level change the same way as any other change', async () => {
    // arrange
    const user = renderBuilder('works');

    // act
    await user.click(screen.getByRole('combobox', { name: 'Level' }));
    await user.click(screen.getByRole('option', { name: 'Advanced' }));

    // assert
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saving…`);
    await waitFor(() => expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`), SAVE_WAIT);
  });
});

describe('a failed draft save', () => {
  it('keeps the change on screen, says it is not saved and offers to try again now', async () => {
    // arrange
    const user = renderBuilder('fails');

    // act
    await moveHypertrophyFirst(user);

    // assert
    const alert = await failedSaveAlert();
    expect(alert).toHaveTextContent(FAILED_SAVE_COPY);
    expect(within(alert).getByRole('button', { name: 'Try again now' })).toBeEnabled();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Not saved`);
    expect(blockTypesOnScreen()).toEqual(['Hypertrophy', 'Foundation', 'Deload']);
    expect(screen.getByText('Stored plan: Foundation, Hypertrophy, Deload')).toBeInTheDocument();
  });

  it('recovers when she tries again now, says all changes are saved and moves focus to the place heading', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    const alert = await failedSaveAlert();
    await user.click(screen.getByRole('button', { name: 'Let draft saves work' }));

    // act
    await user.click(within(alert).getByRole('button', { name: 'Try again now' }));

    // assert
    const trying = within(alert).getByRole('button', { name: 'Trying again…' });
    expect(trying).toHaveAttribute('aria-disabled', 'true');
    expect(trying).toHaveFocus();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saving…`);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument(), SAVE_WAIT);
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`);
    expect(screen.getByText('Stored plan: Hypertrophy, Foundation, Deload')).toBeInTheDocument();
    await waitFor(() => expect(announcer()).toHaveTextContent('All changes saved.'));
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveFocus();
  });

  it('says Still not saved when trying again now fails, without announcing the alert again', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    const alert = await failedSaveAlert();

    // act
    await user.click(within(alert).getByRole('button', { name: 'Try again now' }));

    // assert
    await waitFor(() => expect(announcer()).toHaveTextContent('Still not saved.'), SAVE_WAIT);
    expect(within(alert).getByRole('button', { name: 'Try again now' })).toHaveFocus();
    expect(screen.getAllByRole('alert')).toEqual([alert]);
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Not saved`);
  });

  it('ignores another press while trying again', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    const alert = await failedSaveAlert();
    await user.click(within(alert).getByRole('button', { name: 'Try again now' }));

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(within(alert).getByRole('button', { name: 'Trying again…' })).toHaveFocus();
    await waitFor(() => expect(announcer()).toHaveTextContent('Still not saved.'), SAVE_WAIT);
    expect(within(alert).getByRole('button', { name: 'Try again now' })).toBeInTheDocument();
  });

  it('tries again by itself every 15 seconds, quietly while it keeps failing, and recovers', async () => {
    // arrange
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = renderBuilder('fails', userEvent.setup({ advanceTimers: vi.advanceTimersByTime }));
    await moveHypertrophyFirst(user);
    await failedSaveAlert();
    await act(() => vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS + 1000));
    expect(announcer()).not.toHaveTextContent('Still not saved.');
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Not saved`);
    await user.click(screen.getByRole('button', { name: 'Let draft saves work' }));

    // act
    await act(() => vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS + 1000));

    // assert
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`);
    expect(screen.getByText('Stored plan: Hypertrophy, Foundation, Deload')).toBeInTheDocument();
  });

  it('tries again at once when the connection comes back', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    await failedSaveAlert();
    await user.click(screen.getByRole('button', { name: 'Let draft saves work' }));

    // act
    fireEvent(window, new Event('online'));

    // assert
    await screen.findByText('Stored plan: Hypertrophy, Foundation, Deload', undefined, SAVE_WAIT);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`);
  });

  it('sends a change made while saves fail with the next attempt after the delay', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    await failedSaveAlert();
    await user.click(screen.getByRole('button', { name: 'Let draft saves work' }));

    // act
    within(screen.getByRole('main')).getByRole('button', { name: 'Reorder Deload block' }).focus();
    await user.keyboard('{ArrowUp}');

    // assert
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saving…`);
    await screen.findByText('Stored plan: Hypertrophy, Deload, Foundation', undefined, SAVE_WAIT);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`);
  });
});

describe('a draft that changed elsewhere', () => {
  it('refuses the save, locks the builder in a dialog whose only way on is Reload, and says so in the top bar', async () => {
    // arrange
    const user = renderBuilder('stale');

    // act
    await moveHypertrophyFirst(user);

    // assert
    const dialog = await screen.findByRole('alertdialog', { name: 'This draft changed elsewhere' }, SAVE_WAIT);
    expect(dialog).toHaveAccessibleDescription(
      'It was saved from another tab or device after you opened it here, so what you changed just now wasn’t saved. Reload to see the newer draft.',
    );
    expect(within(dialog).getAllByRole('button')).toHaveLength(1);
    expect(within(dialog).getByRole('button', { name: 'Reload' })).toHaveFocus();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Changed elsewhere`);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Stored plan: Foundation, Hypertrophy, Deload')).toBeInTheDocument();
    expect(closingTheTabIsWarned()).toBe(false);
  });

  it('stays open when she presses Escape', async () => {
    // arrange
    const user = renderBuilder('stale');
    await moveHypertrophyFirst(user);
    await screen.findByRole('alertdialog', { name: 'This draft changed elsewhere' }, SAVE_WAIT);

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.getByRole('alertdialog', { name: 'This draft changed elsewhere' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toHaveFocus();
  });

  it('shows the newer draft without the refused change after Reload, at the same place, with focus on its heading', async () => {
    // arrange
    const user = renderBuilder('stale');
    await moveHypertrophyFirst(user);
    const dialog = await screen.findByRole('alertdialog', undefined, SAVE_WAIT);

    // act
    await user.click(within(dialog).getByRole('button', { name: 'Reload' }));

    // assert
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(blockTypesOnScreen()).toEqual(['Foundation', 'Hypertrophy', 'Deload']);
    expect(draftLine()).toHaveTextContent(new RegExp(`^${DRAFT_LINE}$`));
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveFocus();
  });

  it('replaces the failed-save alert when a retry finds the draft changed elsewhere', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    const alert = await failedSaveAlert();
    await user.click(screen.getByRole('button', { name: 'Refuse draft saves as changed elsewhere' }));

    // act
    await user.click(within(alert).getByRole('button', { name: 'Try again now' }));

    // assert
    await screen.findByRole('alertdialog', { name: 'This draft changed elsewhere' }, SAVE_WAIT);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Changed elsewhere`);
  });
});

describe('leaving the builder with unsaved changes', () => {
  it('warns the browser before closing or reloading only while a change is unsent', async () => {
    // arrange
    const user = renderBuilder('works');
    expect(closingTheTabIsWarned()).toBe(false);

    // act
    await moveHypertrophyFirst(user);

    // assert
    expect(closingTheTabIsWarned()).toBe(true);
    await waitFor(() => expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`), SAVE_WAIT);
    expect(closingTheTabIsWarned()).toBe(false);
  });

  it('keeps warning the browser while the latest changes failed to save', async () => {
    // arrange
    const user = renderBuilder('fails');

    // act
    await moveHypertrophyFirst(user);

    // assert
    await failedSaveAlert();
    expect(closingTheTabIsWarned()).toBe(true);
  });

  it('waits for a save in flight before leaving, without asking', async () => {
    // arrange
    const user = renderBuilder('works');
    await moveHypertrophyFirst(user);

    // act
    await user.click(screen.getByRole('link', { name: 'Back to Jane Doe' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saving…`);
    await screen.findByText('Client page', undefined, SAVE_WAIT);
    expect(screen.getByText('Stored plan: Hypertrophy, Foundation, Deload')).toBeInTheDocument();
  });

  it('asks before leaving once the save she waited for fails', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);

    // act
    await user.click(screen.getByRole('link', { name: 'Back to Jane Doe' }));

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const dialog = await screen.findByRole('dialog', { name: 'Unsaved changes' }, SAVE_WAIT);
    expect(dialog).toHaveAccessibleDescription('Your latest changes aren’t saved yet. If you leave now, they’re lost.');
  });

  it('asks at once after a failed save, opening on Keep editing', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    await failedSaveAlert();

    // act
    await user.click(screen.getByRole('link', { name: 'Back to Jane Doe' }));

    // assert
    const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' });
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Leave without saving' })).toBeInTheDocument();
  });

  it('keeps her in the builder with focus back on the link she used when she keeps editing', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    await failedSaveAlert();
    const back = screen.getByRole('link', { name: 'Back to Jane Doe' });
    await user.click(back);

    // act
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(back).toHaveFocus();
    expect(blockTypesOnScreen()).toEqual(['Hypertrophy', 'Foundation', 'Deload']);
  });

  it('leaves without saving when she confirms', async () => {
    // arrange
    const user = renderBuilder('fails');
    await moveHypertrophyFirst(user);
    await failedSaveAlert();
    await user.click(screen.getByRole('link', { name: 'Back to Jane Doe' }));

    // act
    await user.click(screen.getByRole('button', { name: 'Leave without saving' }));

    // assert
    expect(await screen.findByText('Client page')).toBeInTheDocument();
    expect(screen.getByText('Stored plan: Foundation, Hypertrophy, Deload')).toBeInTheDocument();
  });

  it('leaves at once when every change is saved', async () => {
    // arrange
    const user = renderBuilder('works');
    await moveHypertrophyFirst(user);
    await waitFor(() => expect(draftLine()).toHaveTextContent(`${DRAFT_LINE} · Saved`), SAVE_WAIT);

    // act
    await user.click(screen.getByRole('link', { name: 'Back to Jane Doe' }));

    // assert
    expect(screen.getByText('Client page')).toBeInTheDocument();
  });
});
