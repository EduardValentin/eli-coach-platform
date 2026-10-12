import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { RowActionsMenu } from './RowActionsMenu';

const HINT = 'Used in 2 templates and 3 plans';

function renderMenu() {
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
    const { user } = renderMenu();
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
    const { user, onDelete } = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('does nothing and stays open when the blocked action is chosen with Enter', async () => {
    // arrange
    const { user, onDelete } = renderMenu();
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
    const { user } = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText(HINT)).toBeInTheDocument();
  });

  it('describes the focused blocked action by its hint', async () => {
    // arrange
    const { user } = renderMenu();
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
    const { user, onEdit } = renderMenu();
    await user.click(screen.getByRole('button', { name: 'Actions for Plank' }));

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    // assert
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
