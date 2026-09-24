import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { WITHDRAWAL_WAIVER_COPY } from '../../domain/onboardingCopy';
import {
  canDeliverProgram,
  currentPeriod,
  deliveryDate,
  deriveStatus,
  type CoachingSubscription,
} from '../../domain/coachingSubscription';
import {
  clientStatusLabel,
  isBeforeStage,
  type ClientJourney,
  type JourneyStage,
} from '../../domain/journey';
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
  approved:
    "Eli is putting your program together. You'll find it here as soon as it's ready.",
  'program-ready': "Head to your plan whenever you're ready.",
};

const START_NOW_TITLE = 'Start your program now';

function supportingLine(journey: ClientJourney): string {
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

function reassuranceLine(
  subscription: CoachingSubscription | undefined,
  now: Date,
): string | null {
  if (!subscription) return null;

  const status = deriveStatus(subscription, now);

  if (status === 'active') {
    const period = currentPeriod(subscription, now);
    const endsAt = period?.endsAt ?? subscription.periodEndsAt;
    return endsAt
      ? `Your coaching renews on ${formatJourneyDate(endsAt)}`
      : null;
  }

  if (status === 'cancelled' && subscription.periodEndsAt) {
    return `Your coaching continues until ${formatJourneyDate(subscription.periodEndsAt)}`;
  }

  if (status === 'not-started') {
    const delivery = deliveryDate(subscription);

    return delivery
      ? `Your subscription starts on ${formatJourneyDate(delivery)}, when your program is delivered.`
      : 'Your subscription starts the day your program is ready.';
  }

  return null;
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
          <AlertDialogTitle>{START_NOW_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            {WITHDRAWAL_WAIVER_COPY}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Start my program now
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
  const waiting = subscription ? !canDeliverProgram(subscription, now) : false;
  const delivery = subscription ? deliveryDate(subscription) : null;
  const reassurance = reassuranceLine(subscription, now);

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
        headingId="program-status-heading"
        voice={label}
      >
        <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
          {supportingLine(demoJourney)}
        </p>

        {waiting && delivery && (
          <p className="mt-2 text-sm text-text-secondary">
            Your program will be delivered on {formatJourneyDate(delivery)}.
          </p>
        )}

        {reassurance && (
          <p className="mt-2 text-sm text-text-secondary">{reassurance}</p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {demoJourney.stage === 'needs-details' && (
            <Button
              onClick={() => navigate('/portal/onboarding?answer=1')}
              type="button"
              variant="default"
              size="lg"
              className="w-full sm:w-auto"
            >
              Answer now
            </Button>
          )}

          {(demoJourney.stage === 'program-ready' ||
            demoJourney.stage === 'review-call-scheduled') && (
            <Link
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
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
              size="lg"
              className="w-full sm:w-auto"
            >
              Start my program now
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
