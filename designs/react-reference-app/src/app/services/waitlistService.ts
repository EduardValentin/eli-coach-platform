const EMAILS_KEY = 'eli_waitlist_emails';

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
    'Something went wrong on our end. Try again in a moment — or email contact@elipersonaltrainer.com if it keeps happening.',
};

const MOCK_ALREADY_REGISTERED_EMAIL = 'alreadyregistered@mail.com';
const MOCK_SERVER_ERROR_TRIGGER = 'servererror';

function getEmails(): string[] {
  try {
    const stored = localStorage.getItem(EMAILS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setEmails(emails: string[]) {
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIMULATED_LATENCY_MS = 1200;

function throwError(code: WaitlistErrorCode): never {
  throw new WaitlistError(code, WAITLIST_ERROR_MESSAGES[code]);
}

async function resolveAfterLatency(trimmed: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (trimmed === MOCK_SERVER_ERROR_TRIGGER) {
    throwError('SERVER_ERROR');
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    throwError('INVALID_EMAIL');
  }

  return trimmed;
}

export async function submitWaitlistEmail(
  email: string,
): Promise<{ success: true }> {
  const normalizedEmail = await resolveAfterLatency(email.trim().toLowerCase());
  const emails = getEmails();
  if (
    normalizedEmail !== MOCK_ALREADY_REGISTERED_EMAIL &&
    !emails.includes(normalizedEmail)
  ) {
    setEmails([...emails, normalizedEmail]);
  }

  return { success: true };
}
