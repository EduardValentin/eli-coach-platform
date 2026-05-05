import { useState, useEffect, useCallback } from 'react';

const SPOTS_KEY = 'eli_waitlist_spots_remaining';
const EMAILS_KEY = 'eli_waitlist_emails';
export const MAX_SPOTS = 10;

export type WaitlistErrorCode =
  | 'INVALID_EMAIL'
  | 'ALREADY_REGISTERED'
  | 'SERVER_ERROR';

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
  ALREADY_REGISTERED:
    "Good news — you're already on the list. We'll be in touch when doors open.",
  SERVER_ERROR:
    'Something went wrong on our end. Try again in a moment — or email contact@elipersonaltrainer.com if it keeps happening.',
};

const MOCK_ALREADY_REGISTERED_EMAIL = 'alreadyregistered@mail.com';
const MOCK_SERVER_ERROR_TRIGGER = 'servererror';

export function getSpotsRemaining(): number {
  const stored = localStorage.getItem(SPOTS_KEY);
  if (stored === null) return MAX_SPOTS;
  const num = parseInt(stored, 10);
  return isNaN(num) ? MAX_SPOTS : num;
}

export function getEmails(): string[] {
  try {
    const stored = localStorage.getItem(EMAILS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setSpotsRemaining(count: number) {
  localStorage.setItem(SPOTS_KEY, String(count));
  // Dispatch a storage event so other tabs/components can react
  window.dispatchEvent(new Event('waitlist-update'));
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

  if (trimmed === MOCK_ALREADY_REGISTERED_EMAIL) {
    throwError('ALREADY_REGISTERED');
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    throwError('INVALID_EMAIL');
  }

  return trimmed;
}

export async function submitEmail(
  email: string
): Promise<{ success: boolean; spotsRemaining: number }> {
  const trimmed = email.trim().toLowerCase();
  await resolveAfterLatency(trimmed);

  const emails = getEmails();
  if (emails.includes(trimmed)) {
    throwError('ALREADY_REGISTERED');
  }

  const spots = getSpotsRemaining();
  if (spots <= 0) {
    throwError('SERVER_ERROR');
  }

  const newSpots = spots - 1;
  setSpotsRemaining(newSpots);
  setEmails([...emails, trimmed]);

  return { success: true, spotsRemaining: newSpots };
}

export function resetWaitlist() {
  localStorage.removeItem(SPOTS_KEY);
  localStorage.removeItem(EMAILS_KEY);
  window.dispatchEvent(new Event('waitlist-update'));
}

export function fillAllSpots() {
  localStorage.setItem(SPOTS_KEY, '0');
  window.dispatchEvent(new Event('waitlist-update'));
}

/**
 * Collect an email for the next round when current spots are full.
 * Does not decrement spots or check availability.
 */
export async function submitNotifyEmail(
  email: string
): Promise<{ success: boolean }> {
  const trimmed = email.trim().toLowerCase();
  await resolveAfterLatency(trimmed);

  const emails = getEmails();
  if (emails.includes(trimmed)) {
    throwError('ALREADY_REGISTERED');
  }

  setEmails([...emails, trimmed]);
  return { success: true };
}

/**
 * Hook that keeps spot count in sync across all mounted components.
 * Listens for both same-tab custom events and cross-tab storage events.
 */
export function useWaitlistSpots(): number {
  const [spots, setSpots] = useState(getSpotsRemaining);

  const refresh = useCallback(() => {
    setSpots(getSpotsRemaining());
  }, []);

  useEffect(() => {
    window.addEventListener('waitlist-update', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('waitlist-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return spots;
}
