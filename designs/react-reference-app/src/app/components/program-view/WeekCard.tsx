import type { ReactNode } from 'react';
import { splitLabel } from '../../domain/splitTemplates';
import { Reading } from '../Reading';
import { LABEL_CLASS, VALUE_LG_CLASS } from '../typography';
import { cardVariants } from '../ui/card';
import { Toggle } from '../ui/toggle';
import { cn } from '../ui/utils';
import type { TextPart } from './programTextPlacement';
import { dailyStepsText } from './programView';
import { TextDisclosureGroup, TextDisclosurePanel, TextDisclosureTrigger } from './TextDisclosure';
import type { DaysMode } from './weekSelection';
import type { WeekView } from './weekView';

type WeekCardProps = {
  week: WeekView;
  nav: ReactNode;
  rail: ReactNode;
  mode: DaysMode;
  texts: { blockAndSplit: readonly TextPart[] };
  onModeChange: (mode: DaysMode) => void;
};

const BLOCK_AND_SPLIT_TEXT = 'block-and-split';

export function WeekCard({ week, nav, rail, mode, texts, onModeChange }: WeekCardProps) {
  return (
    <TextDisclosureGroup>
      <div data-parity="week-card" className={cn(cardVariants({ variant: 'panel' }), 'overflow-hidden @3xl:overflow-visible')}>
        <div className="grid grid-cols-1 gap-2 p-3 @3xl:gap-4 @3xl:px-6 @3xl:pt-5 @3xl:pb-0">
          {nav}
          {week.isWritten && (
            <div className="flex items-center justify-between gap-3 px-2 pt-1 @max-rail-wrap:flex-wrap @3xl:items-end @3xl:border-b @3xl:border-border-subtle @3xl:px-0 @3xl:pt-0 @3xl:pb-4">
              <dl className="min-w-0 @3xl:flex @3xl:flex-wrap @3xl:items-end @3xl:gap-x-12 @3xl:gap-y-2">
                <div className="flex items-baseline gap-2.5 @3xl:block">
                  <dt className={LABEL_CLASS}>Split</dt>
                  <dd className={cn(VALUE_LG_CLASS, '@3xl:mt-0.5')}>
                    {texts.blockAndSplit.length > 0 ? (
                      <TextDisclosureTrigger value={BLOCK_AND_SPLIT_TEXT} size="lg">
                        {splitLabel(week.block)}
                      </TextDisclosureTrigger>
                    ) : (
                      splitLabel(week.block)
                    )}
                  </dd>
                </div>
                <Reading as="dl-item" label="Daily steps" value={dailyStepsText(week.block)} size="md" className="flex items-baseline gap-2.5 @3xl:block" />
              </dl>
              <Toggle variant="outline" size="lg" pressed={mode === 'all'} onPressedChange={pressed => onModeChange(pressed ? 'all' : 'focus')} className="shrink-0 px-3.5">
                All days
              </Toggle>
            </div>
          )}
        </div>
        <TextDisclosurePanel value={BLOCK_AND_SPLIT_TEXT} parts={texts.blockAndSplit} headingLevel="h3" />
        {week.isWritten && (
          <div
            className={cn({
              '-mx-px mt-1 -mb-px @max-rail-wrap:m-0 @max-rail-wrap:px-3 @max-rail-wrap:pb-3 @3xl:m-0 @3xl:px-6 @3xl:pt-4 @3xl:pb-6': mode === 'focus',
              'px-3 pt-1 pb-3 @3xl:px-6 @3xl:pt-4 @3xl:pb-6': mode === 'all',
            })}
          >
            {rail}
          </div>
        )}
      </div>
    </TextDisclosureGroup>
  );
}
