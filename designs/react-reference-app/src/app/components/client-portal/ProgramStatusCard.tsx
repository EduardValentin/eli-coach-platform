import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
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
import { startSubscriptionNow } from '../../services/subscriptionService';
import {
  browserTimeZone,
  formatCallSchedule,
} from '../../utils/dateFormatters';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
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

function StartNowDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="rounded-card sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Let Eli start now?</AlertDialogTitle>
          <AlertDialogDescription>
            {IMMEDIATE_START_BODY}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my 14 days</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, start now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProgramStatusCard() {
  const navigate = useNavigate();
  const { demoJourney, startProgramNow } = useClientJourneys();
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);

  const label = clientStatusLabel(demoJourney.stage);
  if (!label) return null;

  const now = new Date();
  const { subscription } = demoJourney;
  const waiting = subscription ? !canStartWork(subscription, now) : false;
  const workStart =
    waiting && subscription ? workStartDate(subscription) : null;

  const startNow = async () => {
    if (!subscription) return;
    setStarting(true);
    const started = await startSubscriptionNow(subscription);
    startProgramNow(demoJourney.callId, started);
    setStarting(false);
    setConfirming(false);
  };

  return (
    <div className="mb-8">
      <ClientWidget
        eyebrow={eyebrowFor(demoJourney.stage)}
        icon={
          <ClipboardList
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        headingId="program-status-heading"
        voice={label}
      >
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          {supportingLine(demoJourney, workStart)}
        </p>

        {waiting && (
          <p className="mt-3 max-w-2xl text-sm text-text-secondary">
            {START_SOONER_NOTE}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {demoJourney.stage === 'needs-details' && (
            <Button
              onClick={() => navigate('/portal/onboarding?answer=1')}
              type="button"
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
            >
              Answer now
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

      <StartNowDialog
        onConfirm={() => void startNow()}
        onOpenChange={setConfirming}
        open={confirming}
      />
    </div>
  );
}
