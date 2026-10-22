import { Printer } from 'lucide-react';
import { PortalBackLink } from '../PortalBackLink';
import { Button } from '../ui/button';
import { ProgramDocument } from './ProgramDocument';
import type { ProgramView } from './programView';

type ProgramDocumentSheetProps = { view: ProgramView; backTo: string; backLabel: string };

export function ProgramDocumentSheet({ view, backTo, backLabel }: ProgramDocumentSheetProps) {
  return (
    <div data-program-page className="min-h-screen bg-surface-page pb-12">
      <div data-print-hidden className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 pt-6">
        <PortalBackLink to={backTo}>{backLabel}</PortalBackLink>
        <Button className="mb-8" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print or save as PDF
        </Button>
      </div>
      <main data-program-sheet className="mx-auto max-w-[210mm] overflow-hidden border border-border shadow-sm">
        <ProgramDocument view={view} />
      </main>
    </div>
  );
}
