import type { CardioIntensity } from '../../domain/program';
import { CARDIO_TALK_TEST } from '../../domain/programCardio';
import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { IntensityValue } from './IntensityValue';

type EffortKeyLayout = 'panel' | 'term';

type LayoutClasses = { frame: string; label: string | null; list: string; item: string; talkTest: string; pill: 'viewer' | 'document' };

const LAYOUT_CLASSES: Record<EffortKeyLayout, LayoutClasses> = {
  panel: { frame: 'grid gap-2 bg-surface-base px-4 py-3 @3xl:px-6', label: LABEL_CLASS, list: 'grid gap-2', item: 'flex items-center gap-3', talkTest: 'text-sm', pill: 'viewer' },
  term: {
    frame: '',
    pill: 'document',
    label: null,
    list: 'grid grid-cols-[auto_minmax(0,1fr)] items-center justify-items-start gap-x-3 gap-y-1.5',
    item: 'contents',
    talkTest: 'text-document-body text-text-primary',
  },
};

export function EffortKey({ intensities, layout }: { intensities: readonly CardioIntensity[]; layout: EffortKeyLayout }) {
  if (intensities.length === 0) return null;
  const classes = LAYOUT_CLASSES[layout];
  return (
    <div data-parity="effort-key" className={classes.frame}>
      {classes.label && <p className={classes.label}>Effort</p>}
      <dl className={classes.list}>
        {intensities.map(intensity => (
          <div key={intensity} className={classes.item}>
            <dt>
              <IntensityValue intensity={intensity} size={classes.pill} />
            </dt>
            <dd className={cn('text-text-secondary', classes.talkTest)}>{CARDIO_TALK_TEST[intensity]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
