export type WaitlistErrorCode = 'INVALID_EMAIL' | 'SERVER_ERROR';

export class WaitlistError extends Error {
  code: WaitlistErrorCode;
  constructor(code: WaitlistErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'WaitlistError';
  }
}

export const WAITLIST_ERROR_MESSAGES: Record<WaitlistErrorCode, string> = {
  INVALID_EMAIL: "That email doesn't look quite right — give it one more look.",
  SERVER_ERROR:
    'Something went wrong on our end. Try again in a moment — or email contact@evoa.fit if it keeps happening.',
};

const MOCK_SERVER_ERROR_TRIGGER = 'servererror';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIMULATED_LATENCY_MS = 1200;

function throwError(code: WaitlistErrorCode): never {
  throw new WaitlistError(code, WAITLIST_ERROR_MESSAGES[code]);
}

async function validateAfterLatency(trimmed: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (trimmed === MOCK_SERVER_ERROR_TRIGGER) {
    throwError('SERVER_ERROR');
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    throwError('INVALID_EMAIL');
  }
}

export async function submitWaitlistEmail(
  email: string,
): Promise<{ success: true }> {
  await validateAfterLatency(email.trim().toLowerCase());

  return { success: true };
}
