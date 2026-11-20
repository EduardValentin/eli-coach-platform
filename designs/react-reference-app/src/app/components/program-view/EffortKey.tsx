import type { CardioIntensity } from '../../domain/program';
import { CARDIO_TALK_TEST } from '../../domain/programCardio';
import { IntensityValue } from './IntensityValue';

type EffortKeyLayout = 'panel' | 'term';

type LayoutClasses = { list: string; item: string; talkTest: string; pill: 'viewer' | 'document' };

const LAYOUT_CLASSES: Record<EffortKeyLayout, LayoutClasses> = {
  panel: { list: 'grid gap-3', item: 'flex items-center gap-3', talkTest: 'text-base text-text-primary', pill: 'viewer' },
  term: {
    pill: 'document',
    list: 'grid grid-cols-[auto_minmax(0,1fr)] items-center justify-items-start gap-x-3 gap-y-1.5',
    item: 'contents',
    talkTest: 'text-document-body text-text-primary',
  },
};

export function EffortKey({ intensities, layout }: { intensities: readonly CardioIntensity[]; layout: EffortKeyLayout }) {
  if (intensities.length === 0) return null;
  const classes = LAYOUT_CLASSES[layout];
  return (
    <dl data-parity="effort-key" className={classes.list}>
      {intensities.map(intensity => (
        <div key={intensity} className={classes.item}>
          <dt>
            <IntensityValue intensity={intensity} size={classes.pill} />
          </dt>
          <dd className={classes.talkTest}>{CARDIO_TALK_TEST[intensity]}</dd>
        </div>
      ))}
    </dl>
  );
}
