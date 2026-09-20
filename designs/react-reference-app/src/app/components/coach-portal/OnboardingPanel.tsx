import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  canDeliverProgram,
  deliveryDate,
} from '../../domain/coachingSubscription';
import { formatRatio, waistToHeightRatio } from '../../domain/bodyMetrics';
import type { ClientJourney } from '../../domain/journey';
import {
  CHECK_IN_CHANNEL_KEY,
  CHECK_IN_DAY_KEY,
  answeredForms,
  collaborationPreference,
  hasPregnancyContext,
  needsSafetyLook,
} from '../../domain/onboardingAnswers';
import { formatJourneyDate, startPathLabel } from '../../utils/journeyLabels';
import { JourneyStageBadge } from './JourneyStageBadge';
import { NeedsDetailsDialog } from './NeedsDetailsDialog';

const PANEL_CLASS =
  'bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50';

const SAFETY_FLAG = 'Needs a look: safety screening';
const RATIO_HIDDEN_NOTE =
  'Hidden while pregnancy or the postpartum period applies.';

function SubHeading({ children }: { children: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
      {children}
    </h3>
  );
}

function RatioReading({
  journey,
  heightCm,
}: {
  journey: ClientJourney;
  heightCm: number;
}) {
  if (hasPregnancyContext(journey.onboarding)) {
    return <p className="text-sm text-text-secondary">{RATIO_HIDDEN_NOTE}</p>;
  }

  const latest = journey.measurements.at(-1);
  const ratio = latest ? waistToHeightRatio(latest.waistCm, heightCm) : null;

  if (ratio === null) {
    return (
      <p className="text-sm text-text-secondary">
        Waiting on her first measurements.
      </p>
    );
  }

  return (
    <p className="font-serif text-2xl text-text-primary">{formatRatio(ratio)}</p>
  );
}

function CollaborationReading({ journey }: { journey: ClientJourney }) {
  const day = collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY);
  const channel = collaborationPreference(
    journey.onboarding,
    CHECK_IN_CHANNEL_KEY,
  );

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-text-secondary">Check-in day</dt>
        <dd className="text-sm font-medium text-text-primary">
          {day ?? 'Not chosen yet'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-text-secondary">Channel</dt>
        <dd className="text-sm font-medium text-text-primary">
          {channel ?? 'Not chosen yet'}
        </dd>
      </div>
    </dl>
  );
}

function AnswerGroups({ journey }: { journey: ClientJourney }) {
  return (
    <div className="space-y-2">
      {answeredForms(journey.onboarding).map((form) => (
        <details
          key={form.formId}
          className="rounded-field border border-neutral-100 px-4 py-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-text-primary">
            {form.label}
          </summary>
          {form.questions.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              Nothing answered here yet.
            </p>
          ) : (
            <dl className="mt-3 space-y-2">
              {form.questions.map((question) => (
                <div key={question.questionId}>
                  <dt className="text-xs text-text-secondary">
                    {question.label}
                  </dt>
                  <dd className="text-sm text-text-primary">
                    {question.answer}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </details>
      ))}
    </div>
  );
}

function ProgramAssignment({
  journey,
  clientId,
}: {
  journey: ClientJourney;
  clientId: string;
}) {
  const { subscription } = journey;
  const now = new Date();
  const deliverOn =
    subscription && !canDeliverProgram(subscription, now)
      ? deliveryDate(subscription)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="outline">
        <Link to={`/coach/training/builder/${clientId}`}>
          Build her program
        </Link>
      </Button>
      {deliverOn && (
        <p className="text-xs text-text-secondary">
          Her program will be delivered on {formatJourneyDate(deliverOn)}.
        </p>
      )}
    </div>
  );
}

export function OnboardingPanel({
  journey,
  clientId,
  heightCm,
}: {
  journey: ClientJourney;
  clientId: string;
  heightCm: number;
}) {
  const { startReview } = useClientJourneys();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const startPath = startPathLabel(journey.subscription);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${PANEL_CLASS} mb-8 space-y-6`}
      aria-labelledby="onboarding-panel-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="onboarding-panel-heading"
          className="flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
        >
          <ClipboardList size={18} className="text-brand" aria-hidden="true" />
          Onboarding
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <JourneyStageBadge stage={journey.stage} />
          {startPath && (
            <span className="text-sm text-text-secondary">{startPath}</span>
          )}
        </div>
      </div>

      {needsSafetyLook(journey.onboarding) && (
        <Alert role="status">{SAFETY_FLAG}</Alert>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <SubHeading>Waist-to-height ratio</SubHeading>
          <RatioReading journey={journey} heightCm={heightCm} />
        </div>
        <div className="space-y-2">
          <SubHeading>How she wants to work together</SubHeading>
          <CollaborationReading journey={journey} />
        </div>
      </div>

      <div className="space-y-3">
        <SubHeading>Her answers</SubHeading>
        <AnswerGroups journey={journey} />
      </div>

      {journey.stage === 'submitted' && (
        <Button onClick={() => startReview(journey.callId)}>Start review</Button>
      )}

      {journey.stage === 'reviewing' && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ProgramAssignment journey={journey} clientId={clientId} />
          <Button variant="outline" onClick={() => setDetailsOpen(true)}>
            Needs more details
          </Button>
        </div>
      )}

      <NeedsDetailsDialog
        journey={journey}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </motion.section>
  );
}
