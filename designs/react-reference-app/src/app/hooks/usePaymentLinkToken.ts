import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

const PAYMENT_LINK_STORAGE_KEY = 'coaching-sales:payment-link';

export function usePaymentLinkToken(): string | null {
  const { hash } = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const linkToken = hash.slice(1);

    if (!linkToken || namesAnElementOnThePage(linkToken)) {
      setToken((current) => current ?? recallPaymentLink());
      return;
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    rememberPaymentLink(linkToken);
    setToken(linkToken);
  }, [hash]);

  return token;
}

function namesAnElementOnThePage(fragment: string): boolean {
  return document.getElementById(fragment) !== null;
}

function rememberPaymentLink(token: string) {
  try {
    window.sessionStorage.setItem(PAYMENT_LINK_STORAGE_KEY, token);
  } catch {
    return;
  }
}

function recallPaymentLink(): string {
  try {
    return window.sessionStorage.getItem(PAYMENT_LINK_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}
