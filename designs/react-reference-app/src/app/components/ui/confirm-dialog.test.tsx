import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

function ConfirmedAction() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Re-send invitation
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Re-send invitation?"
        confirmLabel="Re-send"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('returns focus to the control that opened it when dismissed', async () => {
    // arrange
    const user = userEvent.setup();
    render(<ConfirmedAction />);
    await user.click(screen.getByRole('button', { name: 'Re-send invitation' }));

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Re-send invitation' }),
    ).toHaveFocus();
  });
});
