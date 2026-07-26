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

  it('exposes an error when availability is unavailable', () => {
    // arrange
    render(
      <WaitlistAvailabilityStatus availability={null} variant="dark" />,
    );

    // act
    const alert = screen.queryByRole('alert');
    const progress = screen.queryByRole('progressbar');

    // assert
    expect(alert).toBeInTheDocument();
    expect(progress).not.toBeInTheDocument();
  });

  it('keeps the error visible without creating a duplicate live announcement', () => {
    // arrange
    render(
      <WaitlistAvailabilityStatus
        availability={null}
        outageAnnouncement="none"
        variant="dark"
      />,
    );

    // act
    const alert = screen.queryByRole('alert');
    const visibleMessage = screen.getByRole('paragraph');
    const progress = screen.queryByRole('progressbar');

    // assert
    expect(alert).not.toBeInTheDocument();
    expect(visibleMessage).toBeVisible();
    expect(progress).not.toBeInTheDocument();
  });
});
