import type { ReactNode } from 'react';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import type { TextPart } from './programTextPlacement';
import { TextDisclosureGroup, TextDisclosurePanel } from './TextDisclosure';
import { WEEK_TEXTS } from './WeekNav';
import type { WeekView } from './weekView';

type WeekCardProps = {
  week: WeekView;
  nav: ReactNode;
  rail: ReactNode;
  texts: { blockAndSplit: readonly TextPart[] };
};

export function WeekCard({ week, nav, rail, texts }: WeekCardProps) {
  return (
    <TextDisclosureGroup>
      <div data-parity="week-card" className={cn(cardVariants({ variant: 'panel' }), 'overflow-hidden @3xl:overflow-visible')}>
        <div className={cn('px-4 pt-4 pb-5 @3xl:px-6 @3xl:pt-5', { '@3xl:pb-0': week.isWritten })}>
          <div className={cn({ '@3xl:border-b @3xl:border-border-subtle @3xl:pb-5': week.isWritten })}>{nav}</div>
        </div>
        <TextDisclosurePanel value={WEEK_TEXTS} parts={texts.blockAndSplit} headingLevel="h3" />
        {week.isWritten && (
          <div className="-mx-px -mb-px @max-rail-wrap:m-0 @max-rail-wrap:px-3 @max-rail-wrap:pb-3 @3xl:m-0 @3xl:px-6 @3xl:pt-4 @3xl:pb-6">{rail}</div>
        )}
      </div>
    </TextDisclosureGroup>
  );
}
