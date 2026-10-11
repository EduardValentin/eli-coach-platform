import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarClock, CalendarX } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { RowActionsMenu } from './RowActionsMenu';

const REASON = 'This check-in has already been moved twice.';

function renderMenu() {
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
    const { user, trigger } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(screen.getByRole('menuitem', { name: 'Reschedule' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('can be reached with the arrow keys and explains itself there', async () => {
    // arrange
    const { user, trigger } = renderMenu();
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
    const { user, trigger } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Reschedule' }));

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });

  it('explains itself on a tap without running', async () => {
    // arrange
    const { user, trigger, onReschedule } = renderMenu();
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
    const { user, trigger, onReschedule } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Reschedule' }));

    // assert
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it('does not run on Enter', async () => {
    // arrange
    const { user, trigger, onReschedule } = renderMenu();
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
    const { user, trigger, onCancel } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole('menuitem', { name: 'Cancel' }));

    // assert
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  });
});
