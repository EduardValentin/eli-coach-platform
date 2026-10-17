import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeleteConfirmDialog, type DeletionSubject } from './DeleteConfirmDialog';

const LUNGE: DeletionSubject = { name: 'Lunge' };

function DeletionOf({ subject }: { subject: DeletionSubject }) {
  const [asked, setAsked] = useState<DeletionSubject | null>(subject);

  return (
    <DeleteConfirmDialog
      subject={asked}
      onConfirm={() => setAsked(null)}
      onCancel={() => setAsked(null)}
    />
  );
}

describe('the delete confirmation while it closes', () => {
  let closingAnimation: HTMLStyleElement;

  beforeEach(() => {
    closingAnimation = document.createElement('style');
    closingAnimation.textContent =
      '[role="dialog"][data-state="closed"] { animation-name: closing; }';
    document.head.append(closingAnimation);
  });

  afterEach(() => {
    closingAnimation.remove();
  });

  it('keeps naming the item after Cancel', async () => {
    // arrange
    const user = userEvent.setup();
    render(<DeletionOf subject={LUNGE} />);

    // act
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // assert
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed');
    expect(screen.getByRole('heading', { hidden: true })).toHaveTextContent('Delete “Lunge”?');
  });

  it('keeps naming the item after Delete', async () => {
    // arrange
    const user = userEvent.setup();
    render(<DeletionOf subject={LUNGE} />);

    // act
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // assert
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed');
    expect(screen.getByRole('heading', { hidden: true })).toHaveTextContent('Delete “Lunge”?');
  });
});
