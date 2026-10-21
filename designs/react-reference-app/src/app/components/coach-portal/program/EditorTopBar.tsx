import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowLeft, ChevronRight, Eye, Send, Trash2 } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import type { ProgramVersion } from '../../../domain/program';
import { clientDetailPathForJourney, formatJourneyDate } from '../../../utils/journeyLabels';
import { RowActionsMenu } from '../../RowActionsMenu';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

type EditorTopBarProps = {
  journey: ClientJourney;
  version: ProgramVersion;
  basedOn: ProgramVersion | undefined;
  railToggle: ReactNode;
  libraryToggle: ReactNode;
  currentTitle: string | null;
  onOverview: () => void;
  onOpenWarnings: () => void;
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

function draftLine(name: string, version: ProgramVersion, basedOn: ProgramVersion | undefined): string {
  const origin = version.number > 1 && basedOn?.publishedAt ? ` · from v${version.number - 1}, ${formatJourneyDate(basedOn.publishedAt)}` : '';
  return `${name} · v${version.number} draft${origin}`;
}

function Breadcrumb({ currentTitle, onOverview }: { currentTitle: string | null; onOverview: () => void }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-base font-semibold text-text-primary">
        {currentTitle === null ? (
          <li aria-current="page" className="truncate">
            Overview
          </li>
        ) : (
          <>
            <li className="shrink-0">
              <button
                type="button"
                onClick={onOverview}
                className="rounded-tile text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Overview
              </button>
            </li>
            <li className="flex min-w-0 items-center gap-1">
              <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-text-secondary" />
              <span aria-current="page" className="truncate">
                {currentTitle}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

function WarningsButton({ count, onClick }: { count: number; onClick: () => void }) {
  const label = `${count} ${count === 1 ? 'thing' : 'things'} worth a look`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" aria-label={label} onClick={onClick} className="text-warning tabular-nums">
          <AlertTriangle aria-hidden="true" />
          {count}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function EditorTopBar({
  journey,
  version,
  basedOn,
  railToggle,
  libraryToggle,
  currentTitle,
  onOverview,
  onOpenWarnings,
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
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-card px-3 py-2 lg:px-6">
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={clientDetailPathForJourney(journey)} aria-label={`Back to ${name}`}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          {railToggle}
        </div>
        <div className="grid min-w-0 flex-1 gap-0.5 max-sm:order-last max-sm:basis-full max-sm:px-1">
          <h1 className="truncate text-xs text-text-secondary">{draftLine(name, version, basedOn)}</h1>
          <Breadcrumb currentTitle={currentTitle} onOverview={onOverview} />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {warningsCount > 0 && <WarningsButton count={warningsCount} onClick={onOpenWarnings} />}
          {libraryToggle}
          {opensOn && <p className="hidden text-sm text-text-secondary xl:block">{`Publishing opens on ${formatJourneyDate(opensOn)}`}</p>}
          <Button variant="outline" aria-label="Preview as client" onClick={onPreview}>
            <Eye aria-hidden="true" />
            <span className="hidden lg:inline">Preview as client</span>
          </Button>
          <Button disabled={opensOn !== null} onClick={onPublish}>
            <Send aria-hidden="true" />
            Publish
          </Button>
          <RowActionsMenu
            label="Draft actions"
            parityRoot="DraftActionsMenu"
            actions={[
              {
                name: 'discard',
                label: 'Discard draft',
                icon: Trash2,
                tone: 'destructive',
                onSelect: () => setConfirmingDiscard(true),
              },
            ]}
          />
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
