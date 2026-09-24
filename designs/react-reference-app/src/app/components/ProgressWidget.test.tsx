import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ProgressWidget } from './ProgressWidget';

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

describe('ProgressWidget', () => {
  it('shows a negative weight change with the since line', () => {
    render(
      <ProgressWidget
        headingId="progress-heading"
        presentation="client"
        profile={{ startingWeightKg: 70, currentWeightKg: 68.1 }}
        weightUnit="kg"
      />,
    );

    expect(screen.getByText('-1.9')).toBeVisible();
    expect(screen.getByText('Since 70 kg → 68.1 kg')).toBeVisible();
  });

  it('shows a positive weight change with a leading plus sign', () => {
    render(
      <ProgressWidget
        headingId="progress-heading"
        presentation="coach"
        profile={{ startingWeightKg: 70, currentWeightKg: 72.5 }}
        weightUnit="kg"
      />,
    );

    expect(screen.getByText('+2.5')).toBeVisible();
  });

  it('shows the empty state when there is no profile', () => {
    render(
      <ProgressWidget
        headingId="progress-heading"
        presentation="client"
        profile={null}
        weightUnit="kg"
      />,
    );

    expect(screen.getByText('No weight recorded yet.')).toBeVisible();
  });
});
