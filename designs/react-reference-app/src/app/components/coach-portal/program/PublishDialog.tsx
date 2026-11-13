import { useEffect, useRef, type FormEvent } from 'react';
import type { ProgramVersion } from '../../../domain/program';
import { blockingMessage, warningMessage, type BlockingCode, type RuleFinding, type WarningCode } from '../../../domain/programRules';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { InlineProblem } from '../../InlineProblem';
import { Button } from '../../ui/button';

export type PublishDialogStart = 'top' | 'warnings';

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: PublishDialogStart;
  version: ProgramVersion;
  problems: RuleFinding<BlockingCode>[];
  warnings: RuleFinding<WarningCode>[];
  onPublish: () => void;
  onOpenBlock: (blockId: string) => void;
};

type PublishFormProps = Omit<PublishDialogProps, 'open' | 'version'>;

const PUBLISH_DESCRIPTION = 'The client sees this version as soon as you publish it.';
const LIST_TITLE_CLASS = 'mb-2 text-sm font-semibold text-text-primary';

function ProblemList({ problems, onOpenBlock }: { problems: RuleFinding<BlockingCode>[]; onOpenBlock: (blockId: string) => void }) {
  return (
    <section aria-label="Before you can publish">
      <h4 className={LIST_TITLE_CLASS}>Before you can publish</h4>
      <ul className="grid gap-2">
        {problems.map(problem => (
          <li key={`${problem.code}:${problem.blockId ?? ''}`}>
            {problem.blockId === undefined ? (
              <InlineProblem>{blockingMessage(problem)}</InlineProblem>
            ) : (
              <Button variant="link" className="h-auto whitespace-normal p-0 text-left text-destructive" onClick={() => onOpenBlock(problem.blockId!)}>
                {blockingMessage(problem)}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublishForm({ onOpenChange, startAt, problems, warnings, onPublish, onOpenBlock }: PublishFormProps) {
  const warningsSection = useRef<HTMLElement>(null);
  const blocked = problems.length > 0;

  useEffect(() => {
    if (startAt !== 'warnings') return;
    const frame = requestAnimationFrame(() => warningsSection.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [startAt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onPublish();
  }

  function openBlock(blockId: string) {
    onOpenChange(false);
    onOpenBlock(blockId);
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {(blocked || warnings.length > 0) && (
        <SheetDialogBody>
          <div className="grid gap-6">
            {blocked && <ProblemList problems={problems} onOpenBlock={openBlock} />}
            {warnings.length > 0 && (
              <section ref={warningsSection} aria-label="Worth a look" className="scroll-mt-4">
                <h4 className={LIST_TITLE_CLASS}>Worth a look</h4>
                <ul className="grid list-disc gap-1 pl-5 text-sm text-text-secondary">
                  {warnings.map(warning => (
                    <li key={`${warning.code}:${warning.blockId ?? ''}:${warning.detail ?? ''}`}>{warningMessage(warning)}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </SheetDialogBody>
      )}
      <SheetDialogFooter>
        <SheetDialogActions>
          <Button type="submit" disabled={blocked}>
            {!blocked && warnings.length > 0 ? 'Publish anyway' : 'Publish'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
        </SheetDialogActions>
      </SheetDialogFooter>
    </form>
  );
}

export function PublishDialog({ open, version, ...form }: PublishDialogProps) {
  const title = `Publish version ${version.number}`;
  return (
    <ResponsiveSheetDialog open={open} onOpenChange={form.onOpenChange} title={title} description={PUBLISH_DESCRIPTION}>
      <SheetDialogHeader title={title} description={PUBLISH_DESCRIPTION} />
      {open && <PublishForm {...form} />}
    </ResponsiveSheetDialog>
  );
}
