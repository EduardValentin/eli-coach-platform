import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { canStartWork, workStartDate } from '../../domain/coachingSubscription';
import {
  awaitsCoachReview,
  clientStatusLabel,
  isBeforeStage,
  type ClientJourney,
  type JourneyStage,
} from '../../domain/journey';
import { IMMEDIATE_START_BODY } from '../../domain/startChoiceCopy';
import {
  startSubscriptionNow,
  subscriptionErrorMessage,
} from '../../services/subscriptionService';
import {
  browserTimeZone,
  formatCallSchedule,
} from '../../utils/dateFormatters';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { InlineProblem } from '../InlineProblem';
import { ClientWidget } from './ClientWidget';

function eyebrowFor(stage: JourneyStage): string {
  return isBeforeStage(stage, 'approved') ? 'Your onboarding' : 'Your program';
}

const SUPPORTING_LINES: Partial<Record<JourneyStage, string>> = {
  submitted: 'Eli has your answers and will start on them soon.',
  reviewing:
    "You'll see the next step here as soon as she has looked through your answers.",
  approved: 'Eli is putting your program together.',
  'program-ready': "Head to your plan whenever you're ready.",
};

const START_SOONER_NOTE =
  'Want Eli to start sooner? You can give up your 14-day right of withdrawal and let her begin now.';

function waitingForWorkLine(workStart: Date): string {
  return `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${formatJourneyDate(workStart)}. Your program will be delivered as soon as it is completed.`;
}

function answersWithCoach(stage: JourneyStage): boolean {
  return awaitsCoachReview(stage) && stage !== 'needs-details';
}

function supportingLine(
  journey: ClientJourney,
  workStart: Date | null,
): string {
  if (workStart && answersWithCoach(journey.stage)) {
    return waitingForWorkLine(workStart);
  }

  if (journey.stage === 'needs-details') {
    return journey.review.requests.at(-1)?.message ?? '';
  }

  if (journey.stage === 'review-call-scheduled' && journey.reviewCall) {
    return `Your review call is booked for ${formatCallSchedule(
      journey.reviewCall.startsAt,
      browserTimeZone(),
    )}.`;
  }

  return SUPPORTING_LINES[journey.stage] ?? '';
}

export function ProgramStatusCard() {
  const { appState } = useAppState();
  const { demoJourney, startProgramNow } = useClientJourneys();
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startProblem, setStartProblem] = useState<string | null>(null);

  const label = clientStatusLabel(demoJourney.stage);
  if (!label) return null;

  const now = new Date();
  const { subscription } = demoJourney;
  const waiting = subscription ? !canStartWork(subscription, now) : false;
  const workStart =
    waiting && subscription ? workStartDate(subscription) : null;

  const changeConfirming = (open: boolean) => {
    setConfirming(open);
    if (!open) setStartProblem(null);
  };

  const startNow = async () => {
    if (!subscription) return;
    setStarting(true);
    setStartProblem(null);

    try {
      const started = await startSubscriptionNow(
        subscription,
        appState.startNowOutcome,
      );
      startProgramNow(demoJourney.callId, started);
      setConfirming(false);
    } catch (error) {
      setStartProblem(subscriptionErrorMessage(error, 'start-now-unavailable'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className="mb-8"
      data-parity="program-status"
      data-parity-root="ProgramStatusCard"
    >
      <ClientWidget
        eyebrow={
          <span data-parity="status-eyebrow">
            {eyebrowFor(demoJourney.stage)}
          </span>
        }
        icon={
          <ClipboardList
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        headingId="program-status-heading"
        voice={<span data-parity="status-label">{label}</span>}
      >
        <p
          className="mt-1 max-w-2xl text-sm text-text-secondary"
          data-parity="status-line"
        >
          {supportingLine(demoJourney, workStart)}
        </p>

        {waiting && (
          <p
            className="mt-3 max-w-2xl text-sm text-text-secondary"
            data-parity="start-sooner-note"
          >
            {START_SOONER_NOTE}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {demoJourney.stage === 'needs-details' && (
            <Button
              asChild
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              data-parity="answer-now"
            >
              <Link to="/portal/onboarding?answer=1">Answer now</Link>
            </Button>
          )}

          {(demoJourney.stage === 'program-ready' ||
            demoJourney.stage === 'review-call-scheduled') && (
            <Link
              className={cn(
                buttonVariants({ variant: 'primary', size: 'sm' }),
                'w-full sm:w-auto',
              )}
              to="/portal/plan"
            >
              See my plan
            </Link>
          )}

          {waiting && (
            <Button
              data-parity="start-now"
              disabled={starting}
              onClick={() => setConfirming(true)}
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              Let Eli start now
            </Button>
          )}
        </div>
      </ClientWidget>

      <ConfirmDialog
        cancelLabel="Keep my 14 days"
        confirmDisabled={starting}
        confirmLabel="Yes, start now"
        description={IMMEDIATE_START_BODY}
        onConfirm={() => void startNow()}
        onOpenChange={changeConfirming}
        open={confirming}
        title="Let Eli start now?"
      >
        {startProblem && (
          <InlineProblem data-parity="start-now-problem" role="alert">
            {startProblem}
          </InlineProblem>
        )}
      </ConfirmDialog>
    </div>
  );
}
