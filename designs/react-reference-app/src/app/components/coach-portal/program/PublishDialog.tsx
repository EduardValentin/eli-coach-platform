import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { ProgramVersion } from '../../../domain/program';
import { blockingMessage, warningMessage, type BlockingCode, type RuleFinding, type WarningCode } from '../../../domain/programRules';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { InlineProblem } from '../../InlineProblem';
import { Alert } from '../../ui/alert';
import { Button } from '../../ui/button';
import type { WriteResult } from './useEditorState';

export type PublishDialogStart = 'top' | 'warnings';

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: PublishDialogStart;
  version: ProgramVersion;
  problems: RuleFinding<BlockingCode>[];
  warnings: RuleFinding<WarningCode>[];
  onPublish: () => WriteResult;
  onOpenBlock: (blockId: string) => void;
};

type PublishFormProps = Omit<PublishDialogProps, 'open' | 'version'> & { keepEditing: RefObject<HTMLButtonElement> };

const PUBLISH_DESCRIPTION = 'The client sees this version as soon as you publish it.';
const NOT_PUBLISHED_MESSAGE = 'Publishing didn’t go through. Your draft is unchanged, so try again.';
const LIST_TITLE_CLASS = 'mb-2 text-sm font-semibold text-text-primary';

function ProblemList({ problems, onOpenBlock }: { problems: RuleFinding<BlockingCode>[]; onOpenBlock: (blockId: string) => void }) {
  return (
    <section aria-label="Before you can publish">
      <h3 className={LIST_TITLE_CLASS}>Before you can publish</h3>
      <ul className="grid gap-2">
        {problems.map(problem => (
          <li key={`${problem.code}:${problem.blockId ?? ''}`}>
            {problem.blockId === undefined ? (
              <InlineProblem>{blockingMessage(problem)}</InlineProblem>
            ) : (
              <Button variant="destructive-link" size="inline" onClick={() => onOpenBlock(problem.blockId!)}>
                {blockingMessage(problem)}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublishForm({ onOpenChange, startAt, problems, warnings, onPublish, onOpenBlock, keepEditing }: PublishFormProps) {
  const warningsSection = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);
  const blocked = problems.length > 0;

  useEffect(() => {
    if (startAt !== 'warnings') return;
    const frame = requestAnimationFrame(() => warningsSection.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [startAt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setFailed(onPublish() === 'failed');
  }

  function openBlock(blockId: string) {
    onOpenChange(false);
    onOpenBlock(blockId);
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {(blocked || warnings.length > 0 || failed) && (
        <SheetDialogBody>
          <div className="grid gap-6">
            {failed && <Alert>{NOT_PUBLISHED_MESSAGE}</Alert>}
            {blocked && <ProblemList problems={problems} onOpenBlock={openBlock} />}
            {warnings.length > 0 && (
              <section ref={warningsSection} aria-label="Worth a look" className="scroll-mt-4">
                <h3 className={LIST_TITLE_CLASS}>Worth a look</h3>
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
          <Button ref={keepEditing} type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
        </SheetDialogActions>
      </SheetDialogFooter>
    </form>
  );
}

export function PublishDialog({ open, version, ...form }: PublishDialogProps) {
  const title = `Publish version ${version.number}`;
  const description = form.problems.length > 0 ? undefined : PUBLISH_DESCRIPTION;
  const keepEditing = useRef<HTMLButtonElement>(null);
  return (
    <ResponsiveSheetDialog open={open} onOpenChange={form.onOpenChange} title={title} description={description} initialFocus={keepEditing}>
      <SheetDialogHeader title={title} description={description} />
      {open && <PublishForm {...form} keepEditing={keepEditing} />}
    </ResponsiveSheetDialog>
  );
}
