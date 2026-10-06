import { useState, type ReactNode } from 'react';
import {
  ProviderStandInShell,
  STAND_IN_BACK_LINK_CLASS,
  StandInCardFields,
} from '../components/ProviderStandIn';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../components/ThemeButton';
import { useClientJourneys } from '../context/ClientJourneyContext';
import {
  bundleForMonths,
  bundleTotal,
  renewalLabel,
} from '../domain/bundles';
import type { SubscriptionStartPath } from '../domain/coachingSubscription';
import {
  completeCheckout,
  findCheckoutSession,
} from '../services/checkoutService';
import { toCents } from '../utils/money';

const EYEBROW = 'Stripe Checkout · prototype stand-in';

const HOSTED_PAGE_NOTE =
  "In production this is Stripe's hosted payment page. Nothing here takes a real card.";

const START_PATH_SUMMARY: Record<SubscriptionStartPath, string> = {
  immediate: 'Starts as soon as your payment clears',
  waiting: 'Eli starts working on your program 14 days after payment, unless you let her start sooner',
};

export function CheckoutStandIn() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { demoJourney, journeyForPaymentToken, recordPaid } = useClientJourneys();
  const [paying, setPaying] = useState(false);

  const session = findCheckoutSession(sessionId);

  if (!session) {
    return (
      <StandInShell>
        <h1 className="text-xl font-medium text-text-primary">
          This checkout session has closed
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Open your payment link again to pick a bundle.
        </p>
        <Link className="mt-6 inline-block text-sm text-text-primary underline underline-offset-4" to="/select-bundle">
          Back to the bundles
        </Link>
      </StandInShell>
    );
  }

  const bundle = bundleForMonths(session.bundle);
  const journey = journeyForPaymentToken(session.token) ?? demoJourney;
  const total = bundleTotal(bundle, journey.pricing);
  const cancelledReturn = new URLSearchParams({
    payment: 'cancelled',
    bundle: bundle.id,
    start: session.startPath,
  });

  const pay = async () => {
    setPaying(true);

    const completed = await completeCheckout(sessionId);

    recordPaid(journey.callId, {
      paidAt: completed.paidAt,
      bundle: session.bundle,
      startPath: session.startPath,
      amountPaidCents: toCents(total),
      cardOnFile: completed.cardOnFile,
    });
    navigate(`/checkout/complete?order=${sessionId}`);
  };

  return (
    <StandInShell>
      <h1 className="text-xl font-medium text-text-primary">
        Pay for your coaching bundle
      </h1>

      <dl className="mt-6 grid gap-3 rounded-panel border border-border-subtle bg-surface-quiet px-5 py-4 text-sm">
        <Reading term="Bundle" value={bundle.title} />
        <Reading term="Price per renewal" value={`€${total}`} />
        <Reading term="Renews" value={renewalLabel(bundle.months)} />
        <Reading term="Start" value={START_PATH_SUMMARY[session.startPath]} />
      </dl>

      <StandInCardFields />

      <Button
        aria-busy={paying}
        className="mt-8"
        disabled={paying}
        onClick={pay}
        variant="inverted"
        width="full"
      >
        {paying ? 'Taking payment…' : `Pay €${total}`}
      </Button>

      <Link
        className={STAND_IN_BACK_LINK_CLASS}
        to={`/select-bundle?${cancelledReturn.toString()}`}
      >
        Back
      </Link>
    </StandInShell>
  );
}

function StandInShell({ children }: { children: ReactNode }) {
  return (
    <ProviderStandInShell
      eyebrow={EYEBROW}
      landmarkLabel="Checkout"
      note={HOSTED_PAGE_NOTE}
    >
      {children}
    </ProviderStandInShell>
  );
}

function Reading({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}
