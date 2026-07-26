import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaitlistAvailabilityStatus } from './WaitlistAvailabilityStatus';

describe('WaitlistAvailabilityStatus', () => {
  it('renders one status when availability is known', () => {
    // arrange
    render(
      <WaitlistAvailabilityStatus availability="available" variant="light" />,
    );

    // act
    const status = screen.getByRole('status');

    // assert
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders no availability claim when availability is unavailable', () => {
    // arrange
    render(
      <WaitlistAvailabilityStatus availability={null} variant="dark" />,
    );

    // act
    const status = screen.queryByRole('status');

    // assert
    expect(status).not.toBeInTheDocument();
  });
});
