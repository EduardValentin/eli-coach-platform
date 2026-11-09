import { Link, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { buttonVariants } from '../components/ThemeButton';
import {
  ConfirmationActions,
  ConfirmationHeading,
  ConfirmationLead,
  ConfirmationPage,
  ConfirmationReading,
  ConfirmationReadings,
} from '../components/CheckoutConfirmation';
import { useAppState } from '../context/AppContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { bundleForMonths, bundleTotal, renewalLabel } from '../domain/bundles';
import { withdrawalDeadline } from '../domain/coachingSubscription';
import { findCheckoutSession } from '../services/checkoutService';
import { NotFound } from './NotFound';

const HEADING = 'Payment confirmed';

const IMMEDIATE_START_SUMMARY = "Your program starts as soon as it's ready";

export function CheckoutComplete() {
  const [searchParams] = useSearchParams();
  const { appState } = useAppState();
  const { demoJourney, journeyForPaymentToken } = useClientJourneys();

  if (appState.isWaitlistMode) return <NotFound />;

  const session = findCheckoutSession(searchParams.get('order') ?? '');
  const journey = session
    ? journeyForPaymentToken(session.token) ?? demoJourney
    : demoJourney;
  const subscription = journey.subscription;
  const bundle = bundleForMonths(subscription?.bundle ?? session?.bundle ?? 3);
  const startPath = subscription?.startPath ?? session?.startPath ?? 'immediate';
  const purchasedAt = subscription?.purchasedAt ?? journey.paidAt ?? new Date();

  const startSummary =
    startPath === 'immediate'
      ? IMMEDIATE_START_SUMMARY
      : `After your 14-day withdrawal period — Eli starts working on your program on ${format(withdrawalDeadline(purchasedAt), 'd MMMM yyyy')}. You can let her start sooner from your account`;

  return (
    <ConfirmationPage landmarkLabel="Payment confirmation" parityRoot="CheckoutComplete">
      <ConfirmationHeading outcome="confirmed">{HEADING}</ConfirmationHeading>

      <ConfirmationLead>
        Your invitation is on its way to{' '}
        <span className="font-medium text-text-primary">{journey.profile.identity.email}</span>. It works
        for 30 days once it arrives — you'll create your account from it.
      </ConfirmationLead>

      <ConfirmationReadings className="mt-8">
        <ConfirmationReading term="Bundle" value={bundle.title} />
        <ConfirmationReading term="Amount" value={`€${bundleTotal(bundle, journey.pricing)}`} />
        <ConfirmationReading term="Renews" value={renewalLabel(bundle.months)} />
        <ConfirmationReading term="Your start" value={startSummary} />
      </ConfirmationReadings>

      <ConfirmationActions>
        <Link className={buttonVariants({ variant: 'outline' })} to="/">
          Back to the home page
        </Link>
      </ConfirmationActions>
    </ConfirmationPage>
  );
}
