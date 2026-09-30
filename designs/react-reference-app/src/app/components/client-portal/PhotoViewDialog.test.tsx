import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MeasurementEntry, ProgressPhotoView } from '../../domain/journey';
import { withoutProgressPhoto } from '../../domain/measurements';
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
