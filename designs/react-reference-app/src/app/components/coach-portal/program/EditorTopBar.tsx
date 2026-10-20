import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Eye, Send, Trash2 } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import type { ProgramVersion } from '../../../domain/program';
import { clientDetailPathForJourney, formatJourneyDate } from '../../../utils/journeyLabels';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';

type EditorTopBarProps = {
  journey: ClientJourney;
  version: ProgramVersion;
  basedOn: ProgramVersion | undefined;
  railToggle: ReactNode;
  onPreview: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  opensOn: Date | null;
  warningsCount: number;
};

function discardDescription(version: ProgramVersion): string {
  return version.number > 1
    ? `Everything you changed since version ${version.number - 1} is lost.`
    : 'Nothing has been published yet, so the whole program is deleted.';
}

export function EditorTopBar({
  journey,
  version,
  basedOn,
  railToggle,
  onPreview,
  onPublish,
  onDiscard,
  opensOn,
  warningsCount,
}: EditorTopBarProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const name = `${journey.identity.firstName} ${journey.identity.lastName}`;

  return (
    <>
      <header className="flex min-h-14 shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-4 py-1 lg:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-(--size-control-md) shrink-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm">
              <Link to={clientDetailPathForJourney(journey)} aria-label={`Back to ${name}`}>
                <ArrowLeft size={20} />
              </Link>
            </Button>
            {railToggle}
          </div>
          <div className="grid min-w-0 py-1.5">
            <h1 className="truncate text-base font-semibold text-text-primary">{`${name} · v${version.number} draft`}</h1>
            {version.number > 1 && basedOn?.publishedAt && (
              <p className="truncate text-xs text-text-secondary">
                {`from v${version.number - 1} · ${formatJourneyDate(basedOn.publishedAt)}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex h-(--size-control-md) shrink-0 items-center gap-2">
          {warningsCount > 0 && (
            <Badge tone="pending" className="hidden sm:inline-flex">{`${warningsCount} ${warningsCount === 1 ? 'warning' : 'warnings'}`}</Badge>
          )}
          <Button variant="ghost" aria-label="Discard draft" onClick={() => setConfirmingDiscard(true)}>
            <Trash2 aria-hidden="true" />
            <span className="hidden lg:inline">Discard draft</span>
          </Button>
          <Button variant="outline" aria-label="Preview as client" disabled onClick={onPreview}>
            <Eye aria-hidden="true" />
            <span className="hidden lg:inline">Preview as client</span>
          </Button>
          {opensOn && <p className="hidden text-sm text-text-secondary sm:block">{`Publishing opens on ${formatJourneyDate(opensOn)}`}</p>}
          <Button disabled={opensOn !== null} onClick={onPublish}>
            <Send aria-hidden="true" />
            Publish
          </Button>
        </div>
      </header>
      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Discard this draft?"
        description={discardDescription(version)}
        confirmLabel="Discard draft"
        cancelLabel="Keep editing"
        tone="destructive"
        onConfirm={onDiscard}
      />
    </>
  );
}
