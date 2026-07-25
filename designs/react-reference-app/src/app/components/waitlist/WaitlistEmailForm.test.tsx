import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WaitlistEmailForm } from './WaitlistEmailForm';

const launchConfetti = vi.hoisted(() => vi.fn());

vi.mock('canvas-confetti', () => ({
  default: launchConfetti,
}));

describe('WaitlistEmailForm', () => {
  beforeEach(() => {
    localStorage.clear();
    launchConfetti.mockClear();
  });

  it.each([
    {
      availability: 'available' as const,
      email: 'new@example.com',
      label: 'Join the list',
    },
    {
      availability: 'closed' as const,
      email: 'alreadyregistered@mail.com',
      label: 'Notify me',
    },
  ])(
    'shows the same success and celebration after $availability submission',
    async ({ availability, email, label }) => {
      // arrange
      const user = userEvent.setup();
      render(
        <WaitlistEmailForm availability={availability} variant="light" />,
      );
      await user.type(screen.getByRole('textbox', { name: 'Email address' }), email);

      // act
      await user.click(screen.getByRole('button', { name: label }));

      // assert
      expect(
        await screen.findByText("You're in. Keep an eye on your inbox.", {}, {
          timeout: 2000,
        }),
      ).toBeInTheDocument();
      expect(launchConfetti).toHaveBeenCalledOnce();
    },
  );

  it('keeps the unavailable state open for ordinary signup', async () => {
    // arrange
    const user = userEvent.setup();
    render(<WaitlistEmailForm availability={null} variant="dark" />);
    const emailInput = screen.getByRole('textbox', { name: 'Email address' });

    // act
    await user.type(emailInput, 'visitor@example.com');

    // assert
    expect(emailInput).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Join the list' }),
    ).toBeEnabled();
  });
});
