import { cn } from '../../ui/utils';

/** `corner` pins the mark in a field's top right corner; `inline` sets it in the line it follows. */
type MarkPlacement = 'corner' | 'inline';

const PLACEMENT_CLASS: Record<MarkPlacement, string> = {
  corner: 'pointer-events-none absolute top-1.5 right-1.5',
  inline: 'inline-block shrink-0',
};

type ChangedMarkProps = { placement: MarkPlacement; className?: string };

/** What the coach changed: one dot in the fields, on the week rows and in their legend, larger below md where a 6px dot is hard to see on a phone. */
export function ChangedMark({ placement, className }: ChangedMarkProps) {
  return <span aria-hidden="true" className={cn('size-2 rounded-full bg-text-primary md:size-1.5', PLACEMENT_CLASS[placement], className)} />;
}
