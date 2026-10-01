import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NO_PROGRESS_PHOTOS, type ProgressPhotoSet } from '../../../domain/journey';
import { PROGRESS_PHOTO_MAX_BYTES } from '../../../domain/measurements';
import { PROGRESS_PHOTO_CONSENT_COPY } from '../../../domain/onboardingCopy';
import { ProgressPhotoBlock } from './ProgressPhotoBlock';

const REFUSAL = 'Choose a JPEG, PNG or WebP under 10 MB.';

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:picked'),
  });
});

function PhotoBlock({ consentedAt }: { consentedAt: Date | null }) {
  const [consented, setConsented] = useState(false);
  const [photos, setPhotos] = useState<ProgressPhotoSet>(NO_PROGRESS_PHOTOS);

  return (
    <ProgressPhotoBlock
      consent={
        consentedAt
          ? { status: 'recorded', at: consentedAt }
          : { status: 'asking', ticked: consented, onTickedChange: setConsented }
      }
      onPhotosChange={setPhotos}
      photos={photos}
    />
  );
}

function photoFile(type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], 'photo', { type });
}

describe('the progress photo block', () => {
  it('locks the tiles until she ticks the consent box', async () => {
    // arrange
    render(<PhotoBlock consentedAt={null} />);
    const front = screen.getByLabelText('Add front photo');
    const lockedBefore = (front as HTMLInputElement).disabled;

    // act
    await userEvent.click(
      screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY }),
    );

    // assert
    expect(lockedBefore).toBe(true);
    expect(front).toBeEnabled();
    expect(
      screen.queryByText('Tick the box to add your photos.'),
    ).not.toBeInTheDocument();
  });

  it('clears the photos she picked and locks every tile again when she takes back her consent', async () => {
    // arrange
    render(<PhotoBlock consentedAt={null} />);
    const consent = screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY });
    await userEvent.click(consent);
    await userEvent.upload(
      screen.getByLabelText('Add front photo'),
      photoFile('image/png'),
    );

    // act
    await userEvent.click(consent);

    // assert
    expect(screen.queryByRole('img', { name: 'Front photo' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove front photo' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add front photo')).toBeDisabled();
    expect(screen.getByLabelText('Add side photo')).toBeDisabled();
    expect(screen.getByLabelText('Add back photo')).toBeDisabled();
    expect(screen.getByText('Tick the box to add your photos.')).toBeVisible();
  });

  it('keeps the tiles empty when she ticks her consent again', async () => {
    // arrange
    render(<PhotoBlock consentedAt={null} />);
    const consent = screen.getByRole('checkbox', { name: PROGRESS_PHOTO_CONSENT_COPY });
    await userEvent.click(consent);
    await userEvent.upload(
      screen.getByLabelText('Add front photo'),
      photoFile('image/png'),
    );
    await userEvent.click(consent);

    // act
    await userEvent.click(consent);

    // assert
    expect(screen.queryByRole('img', { name: 'Front photo' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add front photo')).toBeEnabled();
  });

  it('states when she agreed once she has consented and opens the tiles', () => {
    // arrange
    const consentedAt = new Date(2026, 8, 18, 10);

    // act
    render(<PhotoBlock consentedAt={consentedAt} />);

    // assert
    expect(
      screen.getByText('You agreed to share progress photos on 18 September 2026.'),
    ).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add front photo')).toBeEnabled();
    expect(screen.getByLabelText('Add side photo')).toBeEnabled();
    expect(screen.getByLabelText('Add back photo')).toBeEnabled();
  });

  it('accepts only JPEG, PNG and WebP from the picker', () => {
    // arrange
    render(<PhotoBlock consentedAt={new Date(2026, 8, 18)} />);

    // act
    const input = screen.getByLabelText('Add side photo');

    // assert
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('previews a photo she picks and lets her remove it before saving', async () => {
    // arrange
    render(<PhotoBlock consentedAt={new Date(2026, 8, 18)} />);
    await userEvent.upload(
      screen.getByLabelText('Add front photo'),
      photoFile('image/png'),
    );
    const preview = screen.getByRole('img', { name: 'Front photo' });

    // act
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove front photo' }),
    );

    // assert
    expect(preview).toHaveAttribute('src', 'blob:picked');
    expect(screen.queryByRole('img', { name: 'Front photo' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add front photo')).toBeEnabled();
  });

  it('refuses a file of another type', async () => {
    // arrange
    render(<PhotoBlock consentedAt={new Date(2026, 8, 18)} />);

    // act
    await userEvent.upload(
      screen.getByLabelText('Add back photo'),
      photoFile('image/heic'),
      { applyAccept: false },
    );

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent(REFUSAL);
    expect(screen.queryByRole('img', { name: 'Back photo' })).not.toBeInTheDocument();
  });

  it('refuses a photo over 10 MB and clears the message once she picks a good one', async () => {
    // arrange
    render(<PhotoBlock consentedAt={new Date(2026, 8, 18)} />);
    await userEvent.upload(
      screen.getByLabelText('Add front photo'),
      photoFile('image/jpeg', PROGRESS_PHOTO_MAX_BYTES + 1),
    );
    const refusal = screen.getByRole('alert');

    // act
    await userEvent.upload(
      screen.getByLabelText('Add front photo'),
      photoFile('image/webp'),
    );

    // assert
    expect(refusal).toHaveTextContent(REFUSAL);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Front photo' })).toBeVisible();
  });
});
