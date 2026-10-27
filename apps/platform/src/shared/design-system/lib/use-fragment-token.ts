import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export function useFragmentToken(storageKey: string): string | null {
  const { hash } = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const linkToken = hash.slice(1);

    if (!linkToken || namesAnElementOnThePage(linkToken)) {
      setToken((current) => current ?? recallToken(storageKey));
      return;
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    rememberToken(storageKey, linkToken);
    setToken(linkToken);
  }, [hash, storageKey]);

  return token;
}

function namesAnElementOnThePage(fragment: string): boolean {
  return document.getElementById(fragment) !== null;
}

function rememberToken(storageKey: string, token: string) {
  try {
    window.sessionStorage.setItem(storageKey, token);
  } catch {
    return;
  }
}

function recallToken(storageKey: string): string {
  try {
    return window.sessionStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}
