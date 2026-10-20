import { blockingMessage, warningMessage, type BlockingCode, type RuleFinding, type WarningCode } from '../../../domain/programRules';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { InlineProblem } from '../../InlineProblem';
import { Button } from '../../ui/button';

type PublishChecklistProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problems: RuleFinding<BlockingCode>[];
  warnings: RuleFinding<WarningCode>[];
  onPublish: () => void;
  onOpenBlock: (blockId: string) => void;
};

const LIST_TITLE_CLASS = 'mb-2 text-sm font-semibold text-text-primary';

export function PublishChecklist({ open, onOpenChange, problems, warnings, onPublish, onOpenBlock }: PublishChecklistProps) {
  const blocked = problems.length > 0;
  const publishLabel = !blocked && warnings.length > 0 ? 'Publish anyway' : 'Publish';

  function openBlock(blockId: string) {
    onOpenChange(false);
    onOpenBlock(blockId);
  }

  return (
    <ResponsiveSheetDialog open={open} onOpenChange={onOpenChange} title="Publish checklist" width="fit">
      <SheetDialogHeader title="Publish checklist" description="The client sees this version as soon as you publish it." />
      <SheetDialogBody>
        <div className="grid gap-6">
          {blocked && (
            <section aria-label="Before you can publish">
              <h4 className={LIST_TITLE_CLASS}>
                Before you can publish
              </h4>
              <ul className="grid gap-2">
                {problems.map(problem => (
                  <li key={`${problem.code}:${problem.blockId ?? ''}`}>
                    {problem.blockId === undefined ? (
                      <InlineProblem>{blockingMessage(problem)}</InlineProblem>
                    ) : (
                      <Button variant="link" className="h-auto whitespace-normal p-0 text-left text-destructive" onClick={() => openBlock(problem.blockId!)}>
                        {blockingMessage(problem)}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {warnings.length > 0 && (
            <section aria-label="Worth a look">
              <h4 className={LIST_TITLE_CLASS}>
                Worth a look
              </h4>
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
          <Button disabled={blocked} onClick={onPublish}>
            {publishLabel}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
        </SheetDialogActions>
      </SheetDialogFooter>
    </ResponsiveSheetDialog>
  );
}
