import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ProfileDetailsWidget } from './ProfileDetailsWidget';

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

const profile = {
  heightCm: 165.1,
  currentWeightKg: 66.13,
  activityLevel: 'moderately-active' as const,
};

const units = { weightUnit: 'kg' as const, heightUnit: 'cm' as const };

describe('ProfileDetailsWidget on the coach presentation', () => {
  it('shows height & weight and activity level readings', () => {
    render(
      <ProfileDetailsWidget
        headingId="profile-heading"
        profile={profile}
        presentation="coach"
        units={units}
      />,
    );

    expect(screen.getByText('Height & weight')).toBeVisible();
    expect(screen.getByText('165.1 cm / 66.1 kg')).toBeVisible();
    expect(screen.getByText('Activity level')).toBeVisible();
    expect(screen.getByText('Moderately active (3-4 days/week)')).toBeVisible();
  });

  it('falls back to -- when there is no profile', () => {
    render(
      <ProfileDetailsWidget
        headingId="profile-heading"
        profile={null}
        presentation="coach"
        units={units}
      />,
    );

    expect(screen.getAllByText('--')).toHaveLength(2);
  });

  it('renders extra children and the footer link', () => {
    render(
      <ProfileDetailsWidget
        footer={<a href="/edit">Edit</a>}
        headingId="profile-heading"
        profile={profile}
        presentation="coach"
        units={units}
      >
        <p>Cycle detail</p>
      </ProfileDetailsWidget>,
    );

    expect(screen.getByText('Cycle detail')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Edit' })).toBeVisible();
  });
});

describe('ProfileDetailsWidget on the client presentation', () => {
  it('shows the same readings without any management control', () => {
    render(
      <ProfileDetailsWidget
        headingId="profile-heading"
        profile={profile}
        presentation="client"
        units={units}
      />,
    );

    expect(screen.getByText('165.1 cm / 66.1 kg')).toBeVisible();
    expect(screen.getByText('Moderately active (3-4 days/week)')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
