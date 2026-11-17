import { cn } from '../ui/utils';

type SetMarkProps = { kind: 'working' | 'warm-up'; number: number };

export function SetMark({ kind, number }: SetMarkProps) {
  const warmUp = kind === 'warm-up';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn('inline-flex size-7 items-center justify-center rounded-full border border-control-border-soft text-sm font-semibold tabular-nums', {
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
