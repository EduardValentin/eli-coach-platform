import { useState, useEffect, useCallback } from 'react';

const SPOTS_KEY = 'eli_waitlist_spots_remaining';
const EMAILS_KEY = 'eli_waitlist_emails';
export const MAX_SPOTS = 10;

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

export async function submitEmail(
  email: string
): Promise<{ success: boolean; spotsRemaining: number }> {
  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmed)) {
    throw new Error('Please enter a valid email address.');
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const emails = getEmails();
  if (emails.includes(trimmed)) {
    throw new Error("Looks like you're already on the list.");
  }

  const spots = getSpotsRemaining();
  if (spots <= 0) {
    throw new Error(`All ${MAX_SPOTS} spots have been claimed.`);
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
