import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ProgramVersion } from '../../../domain/program';
import {
  blockingMessage,
  requiresWhatChanged,
  warningMessage,
  type BlockingCode,
  type RuleFinding,
  type WarningCode,
} from '../../../domain/programRules';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { InlineProblem } from '../../InlineProblem';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

export type PublishDialogStart = 'top' | 'warnings';

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: PublishDialogStart;
  version: ProgramVersion;
  problems: RuleFinding<BlockingCode>[];
  warnings: RuleFinding<WarningCode>[];
  onFocusChange: (focus: string) => void;
  onWhatChangedChange: (whatChanged: string) => void;
  onPublish: () => void;
  onOpenBlock: (blockId: string) => void;
};

type PublishFormProps = Omit<PublishDialogProps, 'open'>;

const PUBLISH_DESCRIPTION = 'The client sees this version as soon as you publish it.';
const LIST_TITLE_CLASS = 'mb-2 text-sm font-semibold text-text-primary';
const WHAT_CHANGED_MISSING: RuleFinding<BlockingCode> = { code: 'what-changed-missing' };

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

function PublishForm({ onOpenChange, startAt, version, problems, warnings, onFocusChange, onWhatChangedChange, onPublish, onOpenBlock }: PublishFormProps) {
  const ids = { focus: useId(), focusHint: useId(), whatChanged: useId(), whatChangedProblem: useId() };
  const warningsSection = useRef<HTMLElement>(null);
  const whatChangedField = useRef<HTMLTextAreaElement>(null);
  const [showMissing, setShowMissing] = useState(false);
  const whatChangedMissing = problems.some(problem => problem.code === WHAT_CHANGED_MISSING.code);
  const otherProblems = problems.filter(problem => problem.code !== WHAT_CHANGED_MISSING.code);
  const blocked = otherProblems.length > 0;
  const missingShown = showMissing && whatChangedMissing;

  useEffect(() => {
    if (startAt !== 'warnings') return;
    const frame = requestAnimationFrame(() => warningsSection.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [startAt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (whatChangedMissing) {
      setShowMissing(true);
      whatChangedField.current?.focus();
      return;
    }
    onPublish();
  }

  function openBlock(blockId: string) {
    onOpenChange(false);
    onOpenBlock(blockId);
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetDialogBody>
        <div className="grid gap-6">
          {blocked && <ProblemList problems={otherProblems} onOpenBlock={openBlock} />}
          <div className="grid gap-2">
            <div>
              <Label htmlFor={ids.focus}>Focus until the next check-in form</Label>
              <p id={ids.focusHint} className="mt-0.5 text-xs text-text-secondary">
                Shown at the top of her program page and on the PDF cover.
              </p>
            </div>
            <Textarea
              id={ids.focus}
              aria-describedby={ids.focusHint}
              placeholder="e.g. consolidate technique on the main lifts"
              value={version.content.header.focus}
              onChange={event => onFocusChange(event.target.value)}
            />
          </div>
          {requiresWhatChanged(version.number) && (
            <div className="grid gap-2">
              <Label htmlFor={ids.whatChanged} required>
                What changed and why
              </Label>
              <Textarea
                ref={whatChangedField}
                id={ids.whatChanged}
                required
                aria-invalid={missingShown || undefined}
                aria-describedby={missingShown ? ids.whatChangedProblem : undefined}
                value={version.whatChanged}
                onChange={event => onWhatChangedChange(event.target.value)}
              />
              {missingShown && <InlineProblem id={ids.whatChangedProblem}>{blockingMessage(WHAT_CHANGED_MISSING)}</InlineProblem>}
            </div>
          )}
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

export function PublishDialog({ open, ...form }: PublishDialogProps) {
  const title = `Publish version ${form.version.number}`;
  return (
    <ResponsiveSheetDialog open={open} onOpenChange={form.onOpenChange} title={title} description={PUBLISH_DESCRIPTION}>
      <SheetDialogHeader title={title} description={PUBLISH_DESCRIPTION} />
      {open && <PublishForm {...form} />}
    </ResponsiveSheetDialog>
  );
}
