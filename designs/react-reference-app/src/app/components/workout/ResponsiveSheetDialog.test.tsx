import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  ResponsiveSheetDialog,
  SheetDialogFooter,
  SheetDialogHeader,
} from './ResponsiveSheetDialog';

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

describe('ResponsiveSheetDialog width', () => {
  it('fits a centred dialog to its content when the form asks to fit', () => {
    // arrange
    // act
    render(
      <ResponsiveSheetDialog onOpenChange={() => {}} open title="Book your review call" width="fit">
        <p>Open times</p>
      </ResponsiveSheetDialog>,
    );

    // assert
    expect(screen.getByRole('dialog', { name: 'Book your review call' })).toHaveClass('sm:w-fit');
  });

  it('keeps the full dialog width by default', () => {
    // arrange
    // act
    render(
      <ResponsiveSheetDialog onOpenChange={() => {}} open title="Add measurements">
        <p>Fields</p>
      </ResponsiveSheetDialog>,
    );

    // assert
    expect(screen.getByRole('dialog', { name: 'Add measurements' })).not.toHaveClass('sm:w-fit');
  });
});

describe('SheetDialogHeader', () => {
  it('hands its title to a caller that focuses it, reachable by script but not by Tab and without an outline', () => {
    // arrange
    const titleRef = createRef<HTMLHeadingElement>();

    // act
    render(<SheetDialogHeader title="Request a check-in" titleRef={titleRef} />);

    // assert
    const title = screen.getByRole('heading', { name: 'Request a check-in' });
    expect(titleRef.current).toBe(title);
    expect(title).toHaveAttribute('tabindex', '-1');
    expect(title).toHaveClass('outline-none');
  });

  it('draws its rule in the faint stroke when the sheet asks for it', () => {
    // arrange
    // act
    render(<SheetDialogHeader rule="faint" title="Request a check-in" />);

    // assert
    const band = screen.getByRole('heading', { name: 'Request a check-in' }).parentElement;
    expect(band).toHaveClass('border-b', 'border-stroke-faint');
    expect(band).not.toHaveClass('border-border-subtle');
  });
});

describe('SheetDialogFooter', () => {
  it('pins its content under the body on the base surface above a subtle rule by default', () => {
    // arrange
    // act
    render(
      <SheetDialogFooter>
        <button type="button">Book</button>
      </SheetDialogFooter>,
    );

    // assert
    expect(screen.getByRole('button', { name: 'Book' }).parentElement).toHaveClass(
      'shrink-0',
      'border-t',
      'border-border-subtle',
      'bg-surface-base',
      'px-5',
      'py-3',
      'md:px-8',
      'md:py-4',
    );
  });

  it('draws its rule in the faint stroke when the sheet asks for it', () => {
    // arrange
    // act
    render(
      <SheetDialogFooter rule="faint">
        <button type="button">Request</button>
      </SheetDialogFooter>,
    );

    // assert
    const footer = screen.getByRole('button', { name: 'Request' }).parentElement;
    expect(footer).toHaveClass('border-t', 'border-stroke-faint');
    expect(footer).not.toHaveClass('border-border-subtle');
  });
});
