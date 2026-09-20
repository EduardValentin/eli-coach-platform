import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  type ClientJourney,
  type JourneyStage,
} from '../../domain/journey';
import { startSubscriptionNow } from '../../services/subscriptionService';
import { browserTimeZone, formatCallSchedule } from '../../utils/dateFormatters';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { SectionEyebrow } from '../SectionEyebrow';
import { Button, buttonVariants } from '../ThemeButton';
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

const PANEL_CLASS =
  'rounded-panel border border-neutral-100/50 bg-white p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] sm:p-8';

const SUPPORTING_LINES: Partial<Record<JourneyStage, string>> = {
  submitted: 'Eli has your answers and will start on them soon.',
  reviewing: "She's going through everything now.",
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
    return endsAt ? `Your coaching renews on ${formatJourneyDate(endsAt)}` : null;
  }

  if (status === 'cancelled' && subscription.periodEndsAt) {
    return `Your coaching continues until ${formatJourneyDate(subscription.periodEndsAt)}`;
  }

  if (status === 'not-started') {
    return 'Your first period starts on day 1 — the day your program is ready';
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
          <AlertDialogDescription>{WITHDRAWAL_WAIVER_COPY}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Start my program now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProgramStatusCard() {
  const navigate = useNavigate();
  const { demoJourney, startProgramNow } = useClientJourneys();
  const prefersReducedMotion = useReducedMotion() ?? false;
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
    <section aria-labelledby="program-status-heading" className="mb-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={PANEL_CLASS}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      >
        <SectionEyebrow className="mb-2">Your program</SectionEyebrow>
        <h2
          className="font-serif text-2xl tracking-tight text-text-primary lg:text-3xl"
          id="program-status-heading"
        >
          {label}
        </h2>

        <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
          {supportingLine(demoJourney)}
        </p>

        {waiting && delivery && (
          <p className="mt-2 text-sm text-text-secondary">
            Your program will be delivered on {formatJourneyDate(delivery)}.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {demoJourney.stage === 'needs-details' && (
            <Button
              onClick={() => navigate('/portal/onboarding?answer=1')}
              type="button"
              width="full-below-sm"
            >
              Answer now
            </Button>
          )}

          {(demoJourney.stage === 'program-ready' ||
            demoJourney.stage === 'review-call-scheduled') && (
            <Link
              className={buttonVariants({ width: 'full-below-sm' })}
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
              width="full-below-sm"
            >
              Start my program now
            </Button>
          )}
        </div>
      </motion.div>

      {reassurance && (
        <p className="mt-3 px-1 text-sm text-text-secondary">{reassurance}</p>
      )}

      <StartNowDialog
        onConfirm={() => void startNow()}
        onOpenChange={setConfirming}
        open={confirming}
      />
    </section>
  );
}
