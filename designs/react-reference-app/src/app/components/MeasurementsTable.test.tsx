import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MeasurementEntry } from '../domain/journey';
import { MeasurementsTable } from './MeasurementsTable';

const METRIC = { weight: 'kg', length: 'cm' } as const;

const WITHOUT_PHOTOS: MeasurementEntry = {
  id: 'entry-1',
  recordedAt: new Date(2026, 8, 1, 8),
  weightKg: 67.4,
  waistCm: 76.5,
  photos: {},
};

const WITH_PHOTOS: MeasurementEntry = {
  id: 'entry-2',
  recordedAt: new Date(2026, 8, 29, 8),
  weightKg: 66.1,
  waistCm: 74,
  hipsCm: 98,
  photos: { front: { url: 'blob:front' } },
};

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
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

function columnHeaders(): string[] {
  return screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent ?? '');
}

describe('the measurements table', () => {
  it('shows her the history without the ratio', () => {
    // arrange
    const measurements = [WITHOUT_PHOTOS, WITH_PHOTOS];

    // act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={measurements}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(columnHeaders()).toEqual([
      'Date',
      'Weight',
      'Waist',
      'Hips',
      'Thigh',
      'Arm',
    ]);
    expect(
      screen.getByRole('table', { name: 'Measurements history, newest first' }),
    ).toBeVisible();
  });

  it('shows the coach the waist-to-height ratio', () => {
    // arrange
    const measurements = [WITH_PHOTOS];

    // act
    render(
      <MeasurementsTable
        emptyMessage="No measurements yet."
        headingId="measurements-panel-heading"
        heightCm={165}
        measurements={measurements}
        perspective="coach"
        units={METRIC}
      />,
    );

    // assert
    expect(columnHeaders()).toContain('Ratio');
    expect(screen.getByRole('cell', { name: '0.45' })).toBeVisible();
  });

  it('blanks every ratio while the client is pregnant or postpartum', () => {
    // arrange
    const measurements = [WITHOUT_PHOTOS, WITH_PHOTOS];

    // act
    render(
      <MeasurementsTable
        emptyMessage="No measurements yet."
        headingId="measurements-panel-heading"
        heightCm={165}
        measurements={measurements}
        perspective="coach"
        ratioHidden
        units={METRIC}
      />,
    );

    // assert
    const ratioIndex = columnHeaders().indexOf('Ratio');
    const ratioCells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[ratioIndex]);
    expect(ratioCells.map((cell) => cell.textContent)).toEqual(['—', '—']);
  });

  it('offers one "View photos" action only on an entry with photos', () => {
    // arrange
    const measurements = [WITHOUT_PHOTOS, WITH_PHOTOS];

    // act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={measurements}
        onViewPhotos={vi.fn()}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    const actions = screen.getAllByRole('button', { name: /^View photos/ });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName('View photos from 29 September');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('opens the photos of the entry whose action she picks', async () => {
    // arrange
    const onViewPhotos = vi.fn();
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={[WITHOUT_PHOTOS, WITH_PHOTOS]}
        onViewPhotos={onViewPhotos}
        perspective="client"
        units={METRIC}
      />,
    );
    const action = screen.getByRole('button', {
      name: 'View photos from 29 September',
    });

    // act
    await userEvent.click(action);

    // assert
    expect(onViewPhotos).toHaveBeenCalledWith(WITH_PHOTOS);
  });

  it('leaves the actions column out when no entry has photos', () => {
    // arrange
    const measurements = [WITHOUT_PHOTOS];

    // act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={measurements}
        onViewPhotos={vi.fn()}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(columnHeaders()).not.toContain('Actions');
  });
});
