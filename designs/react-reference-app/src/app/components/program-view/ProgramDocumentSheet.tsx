import { Printer } from 'lucide-react';
import { PortalBackLink } from '../PortalBackLink';
import { Button } from '../ui/button';
import { ProgramDocument } from './ProgramDocument';
import type { ProgramView } from './programView';

type ProgramDocumentSheetProps = { view: ProgramView; backTo: string; backLabel: string };

export function ProgramDocumentSheet({ view, backTo, backLabel }: ProgramDocumentSheetProps) {
  return (
    <div className="min-h-screen bg-surface-page">
      <div data-print-hidden className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <PortalBackLink to={backTo}>{backLabel}</PortalBackLink>
        <Button className="mb-8" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print or save as PDF
        </Button>
      </div>
      <ProgramDocument view={view} />
    </div>
  );
}
