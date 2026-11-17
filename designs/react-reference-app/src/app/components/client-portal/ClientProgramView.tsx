import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { ProgramVersion } from '../../domain/program';
import { isWritten } from '../../domain/programTexts';
import { DismissibleNotice } from '../DismissibleNotice';
import { ProgramViewer, type UnwrittenBlock } from '../program-view/ProgramViewer';
import type { ProgramView } from '../program-view/programView';
import type { WeekSelection } from '../program-view/weekSelection';
import { Button } from '../ui/button';

const DISMISSED_KEY = 'program-what-changed-dismissed';

function clientDocumentPath(versionNumber: number): string {
  return `/portal/program/document/${versionNumber}`;
}

function unwrittenDescription({ name, start }: UnwrittenBlock): string {
  const starts = start ? ` ${name} starts on ${format(start, 'd MMMM')}.` : '';
  return `Your coach publishes each block before it starts.${starts}`;
}

function readDismissedVersion(): number | null {
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

function WhatChangedNotice({ version }: { version: ProgramVersion }) {
  const [dismissedVersion, setDismissedVersion] = useState(readDismissedVersion);
  if (version.number <= 1 || !isWritten(version.whatChanged) || version.number === dismissedVersion) return null;

  function dismiss() {
    rememberDismissal(version.number);
    setDismissedVersion(version.number);
  }

  return (
    <DismissibleNotice onDismiss={dismiss} data-parity="what-changed">
      <strong className="font-semibold text-text-primary">{`What changed in version ${version.number}.`}</strong> {version.whatChanged}
    </DismissibleNotice>
  );
}

export function ClientProgramView({ view, selection }: { view: ProgramView; selection: WeekSelection }) {
  const published = view.program.versions.filter(version => version.state !== 'draft');
  return (
    <div className="grid grid-cols-1 gap-6">
      <WhatChangedNotice version={view.version} />
      <ProgramViewer
        view={view}
        selection={selection}
        planPlacement="after-week"
        planVoice="client"
        versions={published.length > 1 ? published : []}
        versionStates="hidden"
        versionAction={version => (
          <Button asChild variant="outline" size="sm">
            <Link to={clientDocumentPath(version.number)}>
              <Download aria-hidden="true" />
              Download PDF
              <span className="sr-only">{`, version ${version.number}`}</span>
            </Link>
          </Button>
        )}
        unwrittenDescription={unwrittenDescription}
      />
    </div>
  );
}
