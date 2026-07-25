import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { WaitlistEmailForm } from './WaitlistEmailForm';

const launchConfetti = vi.hoisted(() => vi.fn());
let prefersReducedMotion = false;
const reducedMotionListeners = new Set<() => void>();

vi.mock('canvas-confetti', () => ({
  default: launchConfetti,
}));

describe('WaitlistEmailForm', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        get matches() {
          return (
            query === '(prefers-reduced-motion)' && prefersReducedMotion
          );
        },
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: () => void) => {
          reducedMotionListeners.add(listener);
        },
        removeEventListener: (_event: string, listener: () => void) => {
          reducedMotionListeners.delete(listener);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  beforeEach(() => {
    preferFullMotion();
    localStorage.clear();
    launchConfetti.mockClear();
  });

  afterAll(() => {
    reducedMotionListeners.clear();
    vi.unstubAllGlobals();
  });

  it('uses visible static submission feedback when reduced motion is requested', async () => {
    // arrange
    const user = userEvent.setup();
    renderUnderReducedMotionPreference(
      <WaitlistEmailForm availability="available" variant="light" />,
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Email address' }),
      'reduced@example.com',
    );

    // act
    await user.click(screen.getByRole('button', { name: 'Join the list' }));
    const loadingText = screen.getByRole('button').textContent;
    const successMessage = await screen.findByText(
      "You're in. Keep an eye on your inbox.",
      {},
      { timeout: 2000 },
    );

    // assert
    expect(loadingText).toBe('Joining the list…');
    expect(successMessage).toBeVisible();
    expect(launchConfetti).toHaveBeenCalledWith({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C81D6B', '#FF4D6D', '#00796B', '#FFD700'],
      disableForReducedMotion: true,
    });
  });

  it('shows validation errors immediately when reduced motion is requested', async () => {
    // arrange
    const user = userEvent.setup();
    renderUnderReducedMotionPreference(
      <WaitlistEmailForm availability="available" variant="light" />,
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Email address' }),
      'invalid',
    );

    // act
    await user.click(screen.getByRole('button', { name: 'Join the list' }));
    const alert = await screen.findByRole('alert', {}, { timeout: 2000 });

    // assert
    expect(alert).toBeVisible();
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

function preferFullMotion() {
  prefersReducedMotion = false;
  notifyReducedMotionListeners();
}

function preferReducedMotion() {
  prefersReducedMotion = true;
  notifyReducedMotionListeners();
}

function notifyReducedMotionListeners() {
  reducedMotionListeners.forEach((listener) => {
    listener();
  });
}

function renderUnderReducedMotionPreference(element: ReactElement) {
  preferReducedMotion();
  const reducedMotionWarning = vi
    .spyOn(console, 'warn')
    .mockImplementation(() => undefined);

  const result = render(element);

  reducedMotionWarning.mockRestore();
  return result;
}
