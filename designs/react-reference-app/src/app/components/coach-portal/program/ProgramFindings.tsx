import { blockingMessage, warningMessage, type BlockingCode, type RuleFinding, type WarningCode } from '../../../domain/programRules';
import { InlineProblem } from '../../ui/inline-problem';
import { EYEBROW_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';

export type FindingTarget = { blockId: string; sessionId?: string };

type ProgramFindingsProps = {
  problems: readonly RuleFinding<BlockingCode>[];
  warnings: readonly RuleFinding<WarningCode>[];
  onOpen: (target: FindingTarget) => void;
};

function targetOf({ blockId, sessionId }: RuleFinding<string>): FindingTarget | null {
  return blockId === undefined ? null : { blockId, sessionId };
}

function keyOf(finding: RuleFinding<string>): string {
  return `${finding.code}:${finding.blockId ?? ''}:${finding.sessionId ?? ''}:${finding.detail ?? ''}`;
}

/** What stands between the draft and publishing, then what is worth a look, each opening the block or session it concerns. */
export function ProgramFindings({ problems, warnings, onOpen }: ProgramFindingsProps) {
  return (
    <div className="grid gap-6">
      {problems.length > 0 && (
        <section aria-label="Before you can publish">
          <h3 className={cn(EYEBROW_CLASS, 'mb-2')}>Before you can publish</h3>
          <ul className="grid gap-2">
            {problems.map(problem => {
              const target = targetOf(problem);
              return (
                <li key={keyOf(problem)}>
                  {target ? (
                    <Button variant="destructive-link" size="inline" onClick={() => onOpen(target)}>
                      {blockingMessage(problem)}
                    </Button>
                  ) : (
                    <InlineProblem>{blockingMessage(problem)}</InlineProblem>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {warnings.length > 0 && (
        <section aria-label="Worth a look">
          <h3 className={cn(EYEBROW_CLASS, 'mb-2')}>Worth a look</h3>
          <ul className="grid list-disc gap-2 pl-5 text-sm text-text-secondary">
            {warnings.map(warning => {
              const target = targetOf(warning);
              return (
                <li key={keyOf(warning)}>
                  {target ? (
                    <Button variant="link" size="inline" onClick={() => onOpen(target)}>
                      {warningMessage(warning)}
                    </Button>
                  ) : (
                    warningMessage(warning)
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
