import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarClock, CalendarX, Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { RowActionsMenu } from './RowActionsMenu';

const HINT = 'Used in 2 templates and 3 plans';

function renderBlockedDeleteMenu() {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <RowActionsMenu
      label="Actions for Plank"
      actions={[
        { name: 'edit', label: 'Edit', icon: Pencil, onSelect: onEdit },
        {
          name: 'delete',
          label: 'Delete',
          icon: Trash2,
          tone: 'destructive',
          disabledHint: HINT,
          onSelect: onDelete,
        },
      ]}
    />,
  );

  return { user: userEvent.setup(), onEdit, onDelete };
}

describe('RowActionsMenu with a blocked action', () => {
  it('keeps the blocked action in the keyboard path, marked unavailable', async () => {
    // arrange
    const { user } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    // assert
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
    expect(deleteItem).toHaveFocus();
    expect(deleteItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('does nothing and stays open when the blocked action is clicked', async () => {
    // arrange
    const { user, onDelete } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('does nothing and stays open when the blocked action is chosen with Enter', async () => {
    // arrange
    const { user, onDelete } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows why the action is blocked on hover', async () => {
    // arrange
    const { user } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText(HINT)).toBeInTheDocument();
  });

  it('describes the focused blocked action by its hint', async () => {
    // arrange
    const { user } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    // assert
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' });
    expect(await screen.findByText(HINT)).toBeInTheDocument();
    expect(deleteItem).toHaveAccessibleDescription(HINT);
  });

  it('still runs an available action', async () => {
    // arrange
    const { user, onEdit } = renderBlockedDeleteMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    // assert
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

const REASON = 'This check-in has already been moved twice.';

function renderMovedCheckinMenu() {
  const onReschedule = vi.fn();
  const onCancel = vi.fn();
  render(
    <RowActionsMenu
      label="More actions"
      actions={[
        {
          name: 'reschedule',
          label: 'Reschedule',
          icon: CalendarClock,
          disabledReason: REASON,
          onSelect: onReschedule,
        },
        { name: 'cancel', label: 'Cancel', icon: CalendarX, tone: 'destructive', onSelect: onCancel },
      ]}
    />,
  );

  return {
    user: userEvent.setup(),
    trigger: screen.getByRole('button', { name: 'More actions' }),
    onReschedule,
    onCancel,
  };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement) {
  await user.click(trigger);
  await screen.findByRole('menu');
}

describe('a row menu action that is not allowed right now', () => {
  it('stays in the menu, marked disabled', async () => {
    // arrange
    const { user, trigger } = renderMovedCheckinMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(screen.getByRole('menuitem', { name: 'Reschedule' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('can be reached with the arrow keys and explains itself there', async () => {
    // arrange
    const { user, trigger } = renderMovedCheckinMenu();
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    // act
    await user.keyboard('{ArrowDown}{ArrowUp}');

    // assert
    const reschedule = screen.getByRole('menuitem', { name: 'Reschedule' });
    expect(reschedule).toHaveFocus();
    await waitFor(() => expect(reschedule).toHaveAccessibleDescription(REASON));
  });

  it('explains itself on hover', async () => {
    // arrange
    const { user, trigger } = renderMovedCheckinMenu();
    await openMenu(user, trigger);

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Reschedule' }));

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });

  it('explains itself on a tap without running', async () => {
    // arrange
    const { user, trigger, onReschedule } = renderMovedCheckinMenu();
    await openMenu(user, trigger);

    // act
    await user.pointer({ keys: '[TouchA]', target: screen.getByRole('menuitem', { name: 'Reschedule' }) });

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it('does not run on a click', async () => {
    // arrange
    const { user, trigger, onReschedule } = renderMovedCheckinMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Reschedule' }));

    // assert
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it('does not run on Enter', async () => {
    // arrange
    const { user, trigger, onReschedule } = renderMovedCheckinMenu();
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await user.keyboard('{ArrowDown}{ArrowUp}');

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it('leaves the other actions running', async () => {
    // arrange
    const { user, trigger, onCancel } = renderMovedCheckinMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Cancel' }));

    // assert
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  });
});
