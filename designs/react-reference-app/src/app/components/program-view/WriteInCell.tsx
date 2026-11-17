import type { ReactNode } from 'react';
import { DOCUMENT_HEAD_CLASS } from '../typography';
import { cn } from '../ui/utils';

/** The pink write-in surface of the printed log; a phone reads the PDF, so the log shows only from `sm` and in print. */
export const LOG_SURFACE_CLASS = 'bg-log-surface max-sm:hidden';

type WriteInKind = 'entry' | 'tick';

const BOX_CLASS: Record<WriteInKind, string> = {
  entry: 'block min-h-[1.8em] w-full',
  tick: 'block size-[1.8em]',
};

type WriteInCellProps = { kind: WriteInKind; as?: 'span' | 'td'; children?: ReactNode };

export function WriteInCell({ kind, as: Band = 'span', children }: WriteInCellProps) {
  return (
    <Band
      aria-hidden="true"
      className={cn(LOG_SURFACE_CLASS, 'text-document-body', {
        'px-[0.32em] py-[0.2em]': Band === 'td',
        'grid content-start gap-[0.45em]': children !== undefined,
      })}
    >
      {children !== undefined && <span className={DOCUMENT_HEAD_CLASS}>{children}</span>}
      <span className={cn('rounded-checkbox border border-control-border-soft bg-surface-base', BOX_CLASS[kind])} />
    </Band>
  );
}
