import { DOCUMENT_MARK_CLASS } from '../typography';
import { cn } from '../ui/utils';

type SetMarkSize = 'viewer' | 'document';
type SetMarkCaption = 'spoken' | 'written';

const SIZE_CLASS: Record<SetMarkSize, string> = {
  viewer: 'size-7 text-sm',
  document: DOCUMENT_MARK_CLASS,
};

type SetKind = 'working' | 'warm-up';
type SetMarkProps = { kind: SetKind; number: number; size?: SetMarkSize; caption?: SetMarkCaption };

function WrittenCaption({ kind, number }: { kind: SetKind; number: number }) {
  if (kind === 'working') return <span className="text-sm whitespace-nowrap text-text-primary">{`Set ${number}`}</span>;
  return (
    <span className="text-sm whitespace-nowrap text-text-primary">
      Warm-up<span className="sr-only">{` set ${number}`}</span>
    </span>
  );
}

export function SetMark({ kind, number, size = 'viewer', caption = 'spoken' }: SetMarkProps) {
  const warmUp = kind === 'warm-up';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-control-border-soft font-semibold tabular-nums', SIZE_CLASS[size], {
          'border-dashed text-set-warm-up': warmUp,
          'text-text-primary': !warmUp,
        })}
      >
        {warmUp ? 'W' : number}
      </span>
      {caption === 'written' ? <WrittenCaption kind={kind} number={number} /> : <span className="sr-only">{warmUp ? `Warm-up set ${number}` : `Set ${number}`}</span>}
    </>
  );
}
