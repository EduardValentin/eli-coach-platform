import { DOCUMENT_MARK_CLASS } from '../typography';
import { cn } from '../ui/utils';

type SetMarkSize = 'viewer' | 'document';

const SIZE_CLASS: Record<SetMarkSize, string> = {
  viewer: 'size-7 text-sm',
  document: DOCUMENT_MARK_CLASS,
};

type SetMarkProps = { kind: 'working' | 'warm-up'; number: number; size?: SetMarkSize };

export function SetMark({ kind, number, size = 'viewer' }: SetMarkProps) {
  const warmUp = kind === 'warm-up';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('inline-flex items-center justify-center rounded-full border border-control-border-soft font-semibold tabular-nums', SIZE_CLASS[size], {
          'border-dashed text-set-warm-up': warmUp,
          'text-text-primary': !warmUp,
        })}
      >
        {warmUp ? 'W' : number}
      </span>
      <span className="sr-only">{warmUp ? `Warm-up set ${number}` : `Set ${number}`}</span>
    </>
  );
}
