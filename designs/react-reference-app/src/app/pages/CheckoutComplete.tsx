import { Link, useSearchParams } from 'react-router';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { buttonVariants, cn } from '../components/ThemeButton';
import { cardVariants } from '../components/ui/card';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { bundleForMonths, bundleTotal, renewalLabel } from '../domain/bundles';
import { withdrawalDeadline } from '../domain/coachingSubscription';
import { findCheckoutSession } from '../services/checkoutService';

const HEADING = 'Payment confirmed';

const IMMEDIATE_START_SUMMARY = "Your program starts as soon as it's ready";

export function CheckoutComplete() {
  const [searchParams] = useSearchParams();
  const { demoJourney, journeyForPaymentToken } = useClientJourneys();

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
      : `Your program will be delivered on ${format(withdrawalDeadline(purchasedAt), 'd MMMM yyyy')} — you can change your mind and start sooner from your account`;

  return (
    <main
      aria-label="Payment confirmation"
      className="min-h-screen bg-surface-page px-4 py-16 sm:px-6"
    >
      <div className={cn(cardVariants({ variant: 'panel' }), 'mx-auto w-full max-w-xl px-6 py-10 sm:px-10')}>
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-surface text-success">
          <Check aria-hidden="true" size={28} />
        </span>

        <h1 className="mt-6 text-center font-serif text-display-sm text-text-primary">
          {HEADING}
        </h1>

        <p className="mt-4 text-center text-base leading-relaxed text-text-secondary">
          Your invitation is on its way. Eli sends it personally to{' '}
          <span className="font-medium text-text-primary">{journey.identity.email}</span>, and it
          works for 30 days once it arrives — you'll create your account from it.
        </p>

        <dl className="mt-8 grid gap-3 rounded-card border border-border-subtle bg-surface-quiet px-5 py-4 text-sm">
          <Reading term="Bundle" value={bundle.title} />
          <Reading term="Amount" value={`€${bundleTotal(bundle, journey.pricing)}`} />
          <Reading term="Renews" value={renewalLabel(bundle.months)} />
          <Reading term="Your start" value={startSummary} />
        </dl>

        <div className="mt-8 flex justify-center">
          <Link className={cn(buttonVariants({ variant: 'outline' }))} to="/">
            Back to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-text-secondary">{term}</dt>
      <dd className="font-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}
