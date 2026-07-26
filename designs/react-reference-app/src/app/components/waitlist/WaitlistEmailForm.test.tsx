import { render, screen, waitFor } from '@testing-library/react';
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
const submitWaitlistEmail = vi.hoisted(() => vi.fn());
let prefersReducedMotion = false;
const reducedMotionListeners = new Set<() => void>();

vi.mock('canvas-confetti', () => ({
  default: launchConfetti,
}));

vi.mock('../../services/waitlistService', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../services/waitlistService')
  >();

  return {
    ...actual,
    submitWaitlistEmail,
  };
});

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
    submitWaitlistEmail.mockReset();
    submitWaitlistEmail.mockResolvedValue({ success: true });
  });

  afterAll(() => {
    reducedMotionListeners.clear();
    vi.unstubAllGlobals();
  });

  it('submits and replaces the form when reduced motion is requested', async () => {
    // arrange
    const user = userEvent.setup();
    renderUnderReducedMotionPreference(
      <WaitlistEmailForm availability="available" variant="light" />,
    );
    await user.type(screen.getByRole('textbox', { name: /\S/ }), 'reduced@example.com');

    // act
    await user.click(screen.getByRole('button', { name: /\S/ }));
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    // assert
    expect(submitWaitlistEmail).toHaveBeenCalledWith('reduced@example.com');
    expect(launchConfetti).toHaveBeenCalledOnce();
  });

  it('shows submission errors immediately when reduced motion is requested', async () => {
    // arrange
    const user = userEvent.setup();
    submitWaitlistEmail.mockRejectedValueOnce(new Error('submission failed'));
    renderUnderReducedMotionPreference(
      <WaitlistEmailForm availability="available" variant="light" />,
    );
    await user.type(screen.getByRole('textbox', { name: /\S/ }), 'invalid');

    // act
    await user.click(screen.getByRole('button', { name: /\S/ }));
    const alert = await screen.findByRole('alert', {}, { timeout: 2000 });

    // assert
    expect(alert).toBeVisible();
    expect(submitWaitlistEmail).toHaveBeenCalledWith('invalid');
  });

  it.each([
    {
      availability: 'available' as const,
      email: 'new@example.com',
    },
    {
      availability: 'closed' as const,
      email: 'alreadyregistered@mail.com',
    },
  ])(
    'shows the same success and celebration after $availability submission',
    async ({ availability, email }) => {
      // arrange
      const user = userEvent.setup();
      render(
        <WaitlistEmailForm availability={availability} variant="light" />,
      );
      await user.type(screen.getByRole('textbox', { name: /\S/ }), email);

      // act
      await user.click(screen.getByRole('button', { name: /\S/ }));
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });

      // assert
      expect(submitWaitlistEmail).toHaveBeenCalledWith(email);
      expect(launchConfetti).toHaveBeenCalledOnce();
    },
  );

  it('keeps the unavailable state open for ordinary signup', async () => {
    // arrange
    const user = userEvent.setup();
    render(<WaitlistEmailForm availability={null} variant="dark" />);
    const emailInput = screen.getByRole('textbox', { name: /\S/ });

    // act
    await user.type(emailInput, 'visitor@example.com');

    // assert
    expect(emailInput).toBeEnabled();
    expect(screen.getByRole('button', { name: /\S/ })).toBeEnabled();
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
