import { Button } from '../ui/button';
import type { ProgramVersion } from '../../domain/program';

const DISMISSED_KEY = 'program-what-changed-dismissed';

export function readDismissedVersion(): number | null {
  try {
    const stored = window.localStorage.getItem(DISMISSED_KEY);
    return stored === null ? null : Number(stored);
  } catch {
    return null;
  }
}

function rememberDismissal(versionNumber: number) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(versionNumber));
  } catch {
    return;
  }
}

type WhatChangedBannerProps = {
  version: ProgramVersion;
  dismissedVersion: number | null;
  onDismiss: () => void;
};

export function WhatChangedBanner({ version, dismissedVersion, onDismiss }: WhatChangedBannerProps) {
  if (version.number <= 1 || version.number === dismissedVersion) return null;
  const headingId = `what-changed-v${version.number}`;

  function dismiss() {
    rememberDismissal(version.number);
    onDismiss();
  }

  return (
    <aside aria-labelledby={headingId} className="flex flex-col gap-2 rounded-card border border-border/50 bg-surface-quiet p-4">
      <h2 id={headingId} className="text-sm font-semibold text-text-primary">
        What changed in v{version.number}
      </h2>
      <p className="text-sm text-text-secondary">{version.whatChanged}</p>
      <Button variant="ghost" size="sm" className="self-start" onClick={dismiss}>
        Dismiss
      </Button>
    </aside>
  );
}
