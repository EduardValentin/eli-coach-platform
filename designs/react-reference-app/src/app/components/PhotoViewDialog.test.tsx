import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MeasurementEntry, ProgressPhotoView } from '../domain/journey';
import { withoutProgressPhoto } from '../domain/measurements';
import { PhotoViewDialog } from './PhotoViewDialog';

const ENTRY: MeasurementEntry = {
  id: 'entry-1',
  recordedAt: new Date(2026, 8, 29, 8),
  weightKg: 66.1,
  waistCm: 74,
  photos: { front: { url: 'blob:front' }, back: { url: 'blob:back' } },
};

function ClientPhotoView({
  onRemovePhoto,
}: {
  onRemovePhoto: (view: ProgressPhotoView) => void;
}) {
  const [entry, setEntry] = useState<MeasurementEntry>(ENTRY);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        View photos
      </button>
      <PhotoViewDialog
        entry={open ? entry : undefined}
        onClose={() => setOpen(false)}
        viewer={{
          role: 'client',
          onRemovePhoto: (view) => {
            onRemovePhoto(view);
            setEntry((current) => withoutProgressPhoto(current, view));
          },
        }}
      />
    </>
  );
}

async function openClientView(onRemovePhoto = vi.fn()) {
  render(<ClientPhotoView onRemovePhoto={onRemovePhoto} />);
  await userEvent.click(screen.getByRole('button', { name: 'View photos' }));

  return screen.getByRole('dialog', { name: 'Photos from 29 September' });
}

describe('the photo view', () => {
  it("shows the entry's front, side and back together", async () => {
    // arrange
    const dialog = await openClientView();

    // act
    const images = screen.getAllByRole('img');

    // assert
    expect(dialog).toHaveAccessibleDescription(
      'Only you and your coach can see these photos.',
    );
    expect(images.map((image) => image.getAttribute('alt'))).toEqual([
      'Front photo',
      'Back photo',
    ]);
    expect(screen.getByText('No side photo')).toBeVisible();
  });

  it('asks before removing a photo', async () => {
    // arrange
    await openClientView();

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove front photo' }),
    );

    // assert
    expect(
      screen.getByRole('dialog', { name: 'Remove this photo?' }),
    ).toHaveAccessibleDescription(
      'It is deleted for you and your coach. Your measurements stay.',
    );
    expect(screen.getByRole('button', { name: 'Keep' })).toBeVisible();
  });

  it('removes the photo once she confirms', async () => {
    // arrange
    const onRemovePhoto = vi.fn();
    await openClientView(onRemovePhoto);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove front photo' }),
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    // assert
    expect(onRemovePhoto).toHaveBeenCalledWith('front');
    expect(
      screen.queryByRole('dialog', { name: 'Remove this photo?' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Front photo' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No front photo')).toBeVisible();
  });

  it('keeps focus inside the photo view once the removed photo is gone', async () => {
    // arrange
    const dialog = await openClientView();
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove front photo' }),
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    // assert
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  it('keeps the photo when she changes her mind', async () => {
    // arrange
    const onRemovePhoto = vi.fn();
    await openClientView(onRemovePhoto);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove back photo' }),
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

    // assert
    expect(onRemovePhoto).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Back photo' })).toBeVisible();
  });

  it('closes on Escape and returns focus to the action that opened it', async () => {
    // arrange
    await openClientView();

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'View photos' })).toHaveFocus(),
    );
  });

  it('shows the coach the same photos without a remove control', () => {
    // arrange
    const viewer = { role: 'coach', clientFirstName: 'Jane' } as const;

    // act
    render(<PhotoViewDialog entry={ENTRY} onClose={vi.fn()} viewer={viewer} />);

    // assert
    expect(
      screen.getByRole('dialog', { name: 'Photos from 29 September' }),
    ).toHaveAccessibleDescription('Only you and Jane can see these photos.');
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });
});

async function openFullScreen(view: ProgressPhotoView) {
  await openClientView();
  await userEvent.click(
    screen.getByRole('button', { name: `Open ${view} photo full screen` }),
  );
}

async function swipe(target: HTMLElement, fromX: number, toX: number) {
  await userEvent.pointer([
    { keys: '[TouchA>]', target, coords: { clientX: fromX, clientY: 300 } },
    { pointerName: 'TouchA', target, coords: { clientX: toX, clientY: 305 } },
    { keys: '[/TouchA]', target },
  ]);
}

function lightbox() {
  return screen.getByRole('dialog', { name: /· \d of \d$/ });
}

describe('the full-screen photo', () => {
  it('opens the tapped photo full screen with its place in the set and the date', async () => {
    // arrange
    await openClientView();

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Open front photo full screen' }),
    );

    // assert
    expect(lightbox()).toHaveAccessibleName('Front · 1 of 2');
    expect(lightbox()).toHaveAccessibleDescription('29 September');
    expect(
      within(lightbox()).getByRole('img', { name: 'Front photo' }),
    ).toHaveAttribute('src', 'blob:front');
  });

  it('moves to the next stored photo with the arrow, skipping a missing view', async () => {
    // arrange
    await openFullScreen('front');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }));

    // assert
    expect(lightbox()).toHaveAccessibleName('Back · 2 of 2');
    expect(within(lightbox()).getByRole('img')).toHaveAccessibleName(
      'Back photo',
    );
  });

  it('cycles round from the last photo to the first and back', async () => {
    // arrange
    await openFullScreen('back');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    const afterNext = lightbox().textContent;
    await userEvent.click(
      screen.getByRole('button', { name: 'Previous photo' }),
    );

    // assert
    expect(afterNext).toContain('Front · 1 of 2');
    expect(lightbox()).toHaveAccessibleName('Back · 2 of 2');
  });

  it('moves between the photos with the arrow keys', async () => {
    // arrange
    await openFullScreen('front');

    // act
    await userEvent.keyboard('{ArrowRight}');
    const afterRight = lightbox().textContent;
    await userEvent.keyboard('{ArrowLeft}');

    // assert
    expect(afterRight).toContain('Back · 2 of 2');
    expect(lightbox()).toHaveAccessibleName('Front · 1 of 2');
  });

  it('moves to the next photo on a swipe left and back on a swipe right', async () => {
    // arrange
    await openFullScreen('front');
    const image = within(lightbox()).getByRole('img');

    // act
    await swipe(image, 240, 150);
    const afterSwipeLeft = lightbox().textContent;
    await swipe(within(lightbox()).getByRole('img'), 100, 200);

    // assert
    expect(afterSwipeLeft).toContain('Back · 2 of 2');
    expect(lightbox()).toHaveAccessibleName('Front · 1 of 2');
  });

  it('stays on the photo when the finger barely moves', async () => {
    // arrange
    await openFullScreen('front');
    const image = within(lightbox()).getByRole('img');

    // act
    await swipe(image, 240, 215);

    // assert
    expect(lightbox()).toHaveAccessibleName('Front · 1 of 2');
  });

  it('doubles the photo on a double click and fits it again on the next', async () => {
    // arrange
    await openFullScreen('front');
    const image = within(lightbox()).getByRole('img');

    // act
    await userEvent.dblClick(image);
    const zoomed = image.style.transform;
    await userEvent.dblClick(image);

    // assert
    expect(zoomed).toBe('scale(2)');
    expect(image.style.transform).toBe('scale(1)');
  });

  it('fits the photo again when she moves to another one', async () => {
    // arrange
    await openFullScreen('front');
    await userEvent.dblClick(within(lightbox()).getByRole('img'));

    // act
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowLeft}');

    // assert
    expect(within(lightbox()).getByRole('img').style.transform).toBe(
      'scale(1)',
    );
  });

  it('closes on Escape back to the photo view with focus on the tapped photo', async () => {
    // arrange
    await openFullScreen('back');
    await userEvent.keyboard('{ArrowRight}');

    // act
    await userEvent.keyboard('{Escape}');

    // assert
    expect(
      screen.queryByRole('dialog', { name: /· \d of \d$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Photos from 29 September' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Open back photo full screen' }),
      ).toHaveFocus(),
    );
  });

  it('closes with its Close button and returns focus to the tapped photo', async () => {
    // arrange
    await openFullScreen('front');

    // act
    await userEvent.click(
      within(lightbox()).getByRole('button', { name: 'Close' }),
    );

    // assert
    expect(
      screen.queryByRole('dialog', { name: /· \d of \d$/ }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Open front photo full screen' }),
      ).toHaveFocus(),
    );
  });

  it('offers no arrows when the entry has a single photo', async () => {
    // arrange
    const entry = { ...ENTRY, photos: { side: { url: 'blob:side' } } };
    render(
      <PhotoViewDialog
        entry={entry}
        onClose={vi.fn()}
        viewer={{ role: 'coach', clientFirstName: 'Jane' }}
      />,
    );

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Open side photo full screen' }),
    );

    // assert
    expect(lightbox()).toHaveAccessibleName('Side · 1 of 1');
    expect(
      screen.queryByRole('button', { name: /^(Next|Previous) photo$/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the coach the same full-screen photo without a remove control', async () => {
    // arrange
    render(
      <PhotoViewDialog
        entry={ENTRY}
        onClose={vi.fn()}
        viewer={{ role: 'coach', clientFirstName: 'Jane' }}
      />,
    );

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Open back photo full screen' }),
    );

    // assert
    expect(lightbox()).toHaveAccessibleName('Back · 2 of 2');
    expect(
      within(lightbox()).getByRole('button', { name: 'Previous photo' }),
    ).toBeVisible();
    expect(
      within(lightbox()).queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps Remove in the photo view, not in the full-screen photo', async () => {
    // arrange
    await openClientView();

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Open front photo full screen' }),
    );

    // assert
    expect(
      within(lightbox()).queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });
});
