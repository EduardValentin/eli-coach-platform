import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './bottom-sheet';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

function SheetOpener() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="More"
        description="The rest of your portal"
      >
        <a href="/portal/cycle">Cycle</a>
      </BottomSheet>
    </>
  );
}

describe('BottomSheet', () => {
  it('opens as a dialog named by its title and described by its description', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SheetOpener />);

    // act
    await user.click(screen.getByRole('button', { name: 'Open sheet' }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(sheet).toHaveAccessibleDescription('The rest of your portal');
    expect(screen.getByText('More')).toHaveClass('sr-only');
  });

  it('closes on Escape and returns focus to the control that opened it', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SheetOpener />);
    const opener = screen.getByRole('button', { name: 'Open sheet' });
    await user.click(opener);

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), {
      timeout: 3000,
    });
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
