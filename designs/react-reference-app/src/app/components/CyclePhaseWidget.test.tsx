import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CyclePhaseWidget } from './CyclePhaseWidget';

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

const phase = { phaseName: 'Luteal', dayInCycle: 21, phaseColor: '#a855f7' };

describe('CyclePhaseWidget on the coach presentation', () => {
  it('colours the phase name with the phase colour', () => {
    render(
      <CyclePhaseWidget
        headingId="phase-heading"
        phase={phase}
        presentation="coach"
      />,
    );

    const name = screen.getByText('Luteal');
    expect(name).toHaveStyle({ color: '#a855f7' });
    expect(screen.getByText('Day')).toBeVisible();
    expect(screen.getByText('21')).toBeVisible();
  });

  it('shows the empty state when there is no phase', () => {
    render(
      <CyclePhaseWidget
        headingId="phase-heading"
        phase={null}
        presentation="coach"
      />,
    );

    expect(screen.getByText('No cycle data yet.')).toBeVisible();
  });
});

describe('CyclePhaseWidget on the client presentation', () => {
  it('renders the phase name in plain text, not coloured', () => {
    render(
      <CyclePhaseWidget
        headingId="phase-heading"
        phase={phase}
        presentation="client"
      />,
    );

    const name = screen.getByText('Luteal');
    expect(name).not.toHaveAttribute('style');
    expect(screen.getByText('Day')).toBeVisible();
    expect(screen.getByText('21')).toBeVisible();
  });

  it('renders extra children under the day line', () => {
    render(
      <CyclePhaseWidget
        headingId="phase-heading"
        phase={phase}
        presentation="client"
      >
        <p>Extra tip</p>
      </CyclePhaseWidget>,
    );

    expect(screen.getByText('Extra tip')).toBeVisible();
  });
});
