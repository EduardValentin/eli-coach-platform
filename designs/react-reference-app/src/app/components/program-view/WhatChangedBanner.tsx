import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import type { ProgramVersion } from '../../domain/program';
import { WIDGET_SUBHEADING_CLASS } from '../typography';
import { cn } from '../ui/utils';

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
    <aside aria-labelledby={headingId} className="grid gap-2 rounded-card border border-brand-secondary/20 bg-brand-secondary-surface p-4">
      <h2 id={headingId} className={cn('flex items-center gap-2', WIDGET_SUBHEADING_CLASS)}>
        <Sparkles aria-hidden="true" className="size-4 text-brand-secondary" />
        What changed in v{version.number}
      </h2>
      <p className="text-sm leading-relaxed text-text-primary">{version.whatChanged}</p>
      <Button variant="ghost" size="sm" className="-ml-3 justify-self-start" onClick={dismiss}>
        Dismiss
      </Button>
    </aside>
  );
}
