import { format } from 'date-fns';
import { Route } from 'lucide-react';
import type { ReactNode } from 'react';
import { daysUntil, nextCheckpoint } from '../../domain/programCalendar';
import { counted } from '../../utils/counted';
import { Reading } from '../Reading';
import { SettingsBody, SettingsSection } from '../SettingsSection';
import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { PlanTimeline, type TimelineWeekAction } from './PlanTimeline';
import { TemplateBody, type TemplateParagraph } from './ProgramText';
import type { PlacedTexts } from './programTextPlacement';
import { planReadingText, type ProgramView } from './programView';

export type PlanVoice = 'client' | 'coach';

const LEAD_LABELS: Record<PlanVoice, { focus: string; note: string }> = {
  client: { focus: 'Your focus', note: 'A note from your coach' },
  coach: { focus: 'Focus', note: 'Personal note' },
};

type ProgramPlanProps = {
  view: ProgramView;
  voice: PlanVoice;
  lead?: PlacedTexts['plan'];
  reading?: ReactNode;
  notice?: ReactNode;
  shownWeek?: number;
  weekAction: TimelineWeekAction;
};

function inDays(days: number): string {
  if (days === 0) return 'today';
  return `in ${counted(days, 'day')}`;
}

function LeadText({ label, paragraphs, size }: { label: string; paragraphs: readonly TemplateParagraph[]; size: 'lg' | 'base' }) {
  if (paragraphs.length === 0) return null;
  return (
    <div>
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="mt-1">
        <TemplateBody paragraphs={paragraphs} className={cn('max-w-2xl text-text-primary', { 'text-lg font-medium': size === 'lg', 'text-base': size === 'base' })} />
      </dd>
    </div>
  );
}

export function ProgramPlanSummary({ view, voice, lead, reading, notice, shownWeek, weekAction }: ProgramPlanProps) {
  const { dayOne, today, preferredWeekday, position } = view;
  const { blocks } = view.version.content.plan;
  const checkIn = dayOne && position.status === 'in-plan' ? nextCheckpoint(dayOne, preferredWeekday, today) : null;
  const shownLead = lead && (lead.focus.length > 0 || lead.note.length > 0) ? lead : null;
  const hasLead = shownLead !== null;
  const plan = planReadingText(view);
  const labels = LEAD_LABELS[voice];

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-6">
        <div className={cn('grid grid-cols-1 gap-6', { '@3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:gap-10': hasLead })}>
          {shownLead && (
            <dl className="grid gap-4" data-parity="plan-lead">
              <LeadText label={labels.focus} paragraphs={shownLead.focus} size="lg" />
              <LeadText label={labels.note} paragraphs={shownLead.note} size="base" />
            </dl>
          )}
          <dl className={cn('grid grid-cols-2 content-start gap-x-6 gap-y-4 @3xl:flex @3xl:gap-x-10', { '@3xl:border-l @3xl:border-border-subtle @3xl:pl-10': hasLead })}>
            <Reading as="dl-item" size="md" label="Plan" valueParity="plan-week-reading" value={plan.value} detail={plan.detail} />
            {checkIn && (
              <Reading
                as="dl-item"
                size="md"
                label="Next check-in form"
                valueParity="plan-check-in-reading"
                value={format(checkIn, 'EEE d MMM')}
                detail={inDays(daysUntil(today, checkIn))}
              />
            )}
            {reading}
          </dl>
        </div>
        <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday={preferredWeekday} today={today} shownWeek={shownWeek} weekAction={weekAction} />
        {notice}
      </div>
    </div>
  );
}

export function ProgramPlan(props: ProgramPlanProps) {
  return (
    <SettingsSection headingId="program-plan" title="Plan" icon={Route}>
      <SettingsBody>
        <ProgramPlanSummary {...props} />
      </SettingsBody>
    </SettingsSection>
  );
}
