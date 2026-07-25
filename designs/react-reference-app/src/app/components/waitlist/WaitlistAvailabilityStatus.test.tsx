import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaitlistAvailabilityStatus } from './WaitlistAvailabilityStatus';

describe('WaitlistAvailabilityStatus', () => {
  it.each([
    ['available', 'Reduced-price spots available'],
    ['limited', 'Limited spots'],
    ['closed', 'Reduced-price spots closed'],
  ] as const)('shows the qualitative %s label', (availability, label) => {
    // arrange
    render(
      <WaitlistAvailabilityStatus
        availability={availability}
        variant="light"
      />,
    );

    // act
    const status = screen.getByRole('status');

    // assert
    expect(status).toHaveTextContent(label);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\s+of\s+\d+/i)).not.toBeInTheDocument();
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
