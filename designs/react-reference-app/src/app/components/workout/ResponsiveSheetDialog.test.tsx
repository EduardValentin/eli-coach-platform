import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ResponsiveSheetDialog } from './ResponsiveSheetDialog';

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

describe('ResponsiveSheetDialog', () => {
  it('closes on Escape and offers its close control by default', async () => {
    // arrange
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ResponsiveSheetDialog onOpenChange={onOpenChange} open title="Log a set">
        <p>Reps and weight</p>
      </ResponsiveSheetDialog>,
    );
    const closeControl = screen.queryByRole('button', { name: 'Close' });

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(closeControl).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stays open on Escape and offers no close control while dismissal is locked', async () => {
    // arrange
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ResponsiveSheetDialog dismissal="locked" onOpenChange={onOpenChange} open title="Log a set">
        <p>Reps and weight</p>
      </ResponsiveSheetDialog>,
    );

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Log a set' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
