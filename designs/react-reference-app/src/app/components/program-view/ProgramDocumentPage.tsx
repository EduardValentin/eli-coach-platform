import type { ReactNode } from 'react';
import { Printer, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { ProgramLoadOutcome } from '../../services/programLoadService';
import { DeadEndPanel } from '../ErrorPage';
import { PortalBackLink } from '../PortalBackLink';
import { Button } from '../ui/button';
import { SkipLink } from '../ui/skip-link';
import { cn } from '../ui/utils';
import { DOCUMENT_SHEET_WIDTH_CLASS, ProgramDocument } from './ProgramDocument';
import { ProgramLoadState } from './ProgramLoadState';
import type { ProgramView } from './programView';

const MAIN_ID = 'program-document';
const COLUMN_CLASS = cn('mx-auto w-full', DOCUMENT_SHEET_WIDTH_CLASS);
const PHONE_LOG_HINT = 'Your log prints with the PDF: each training day gets a page with a pink column. Fill it in by hand and photograph it for your check-in form.';

type BackTo = { backTo: string; backLabel: string };

type MainFrame = 'paper' | 'gutter';

const MAIN_FRAME_CLASS: Record<MainFrame, string> = {
  paper: 'sm:overflow-hidden sm:border sm:border-border sm:shadow-card',
  gutter: 'px-4',
};

type DocumentPageProps = BackTo & { actions?: ReactNode; frame: MainFrame; children: ReactNode };

function DocumentPage({ backTo, backLabel, actions, frame, children }: DocumentPageProps) {
  return (
    <div data-program-page className="min-h-screen bg-surface-page pb-12">
      <SkipLink targetId={MAIN_ID} />
      <header data-print-hidden className={cn(COLUMN_CLASS, 'px-4 pt-6 sm:flex sm:items-center sm:justify-between sm:gap-6')}>
        <PortalBackLink to={backTo}>{backLabel}</PortalBackLink>
        {actions}
      </header>
      <main id={MAIN_ID} tabIndex={-1} data-program-sheet={frame === 'paper' || undefined} className={cn(COLUMN_CLASS, MAIN_FRAME_CLASS[frame])}>
        {children}
      </main>
    </div>
  );
}

function PrintAction() {
  return (
    <div className="mb-8 grid gap-2">
      <Button size="md" className="w-full sm:w-auto" onClick={() => window.print()}>
        <Printer aria-hidden="true" />
        Print or save as PDF
      </Button>
      <p className="text-sm text-text-secondary sm:hidden">{PHONE_LOG_HINT}</p>
    </div>
  );
}

export function ProgramDocumentPage({ view, backTo, backLabel }: BackTo & { view: ProgramView }) {
  return (
    <DocumentPage backTo={backTo} backLabel={backLabel} actions={<PrintAction />} frame="paper">
      <ProgramDocument view={view} />
    </DocumentPage>
  );
}

export function ProgramDocumentNotice({ backTo, backLabel, children }: BackTo & { children: ReactNode }) {
  return (
    <DocumentPage backTo={backTo} backLabel={backLabel} frame="gutter">
      {children}
    </DocumentPage>
  );
}

type LoadingDocumentProps = BackTo & { load: Exclude<ProgramLoadOutcome, 'ready'>; onRetry: () => void };

export function ProgramDocumentLoadState({ backTo, backLabel, load, onRetry }: LoadingDocumentProps) {
  return (
    <ProgramDocumentNotice backTo={backTo} backLabel={backLabel}>
      {load === 'loading' && <h1 className="sr-only">Program document</h1>}
      <ProgramLoadState load={load} onRetry={onRetry} headingLevel="h1" />
    </ProgramDocumentNotice>
  );
}

type UnavailableDocumentProps = BackTo & {
  icon: LucideIcon;
  title: string;
  description: string;
  way: { to: string; label: string };
};

export function ProgramDocumentUnavailable({ backTo, backLabel, icon, title, description, way }: UnavailableDocumentProps) {
  return (
    <ProgramDocumentNotice backTo={backTo} backLabel={backLabel}>
      <DeadEndPanel
        icon={icon}
        title={title}
        description={description}
        announcement="none"
        action={
          <Button variant="outline" size="md" asChild>
            <Link to={way.to}>{way.label}</Link>
          </Button>
        }
      />
    </ProgramDocumentNotice>
  );
}
