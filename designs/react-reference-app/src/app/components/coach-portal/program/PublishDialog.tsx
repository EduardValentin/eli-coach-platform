import { useRef, useState, type FormEvent, type RefObject } from 'react';
import type { ProgramVersion } from '../../../domain/program';
import type { BlockingCode, RuleFinding, WarningCode } from '../../../domain/programRules';
import { ResponsiveSheetDialog, SheetDialogActions, SheetDialogBody, SheetDialogFooter, SheetDialogHeader } from '../../ResponsiveSheetDialog';
import { Alert } from '../../ui/alert';
import { Button } from '../../ui/button';
import { ProgramFindings, type FindingTarget } from './ProgramFindings';
import type { WriteResult } from './useEditorState';

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ProgramVersion;
  problems: RuleFinding<BlockingCode>[];
  warnings: RuleFinding<WarningCode>[];
  onPublish: () => WriteResult;
  onOpenFinding: (target: FindingTarget) => void;
};

type PublishFormProps = Omit<PublishDialogProps, 'open' | 'version'> & { keepEditing: RefObject<HTMLButtonElement> };

const PUBLISH_DESCRIPTION = 'The client sees this version as soon as you publish it.';
const NOT_PUBLISHED_MESSAGE = 'Publishing didn’t go through. Your draft is unchanged, so try again.';

function PublishForm({ onOpenChange, problems, warnings, onPublish, onOpenFinding, keepEditing }: PublishFormProps) {
  const [failed, setFailed] = useState(false);
  const blocked = problems.length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    setFailed(onPublish() === 'failed');
  }

  function openFinding(target: FindingTarget) {
    onOpenChange(false);
    onOpenFinding(target);
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {(blocked || warnings.length > 0 || failed) && (
        <SheetDialogBody>
          <div className="grid gap-6">
            {failed && <Alert>{NOT_PUBLISHED_MESSAGE}</Alert>}
            <ProgramFindings problems={problems} warnings={warnings} onOpen={openFinding} />
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
