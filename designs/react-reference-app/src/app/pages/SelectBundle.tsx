import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { AlertCircle, Calendar, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { BundleSelector } from '../components/BundleSelector';
import { LegalFooter } from '../components/legal/LegalNav';
import { StartChoice } from '../components/StartChoice';
import { Button, buttonVariants } from '../components/ThemeButton';
import { useAppState } from '../context/AppContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { bundleById, type BundleId } from '../domain/bundles';
import type { SubscriptionStartPath } from '../domain/coachingSubscription';
import { START_CHOICE_REQUIRED } from '../domain/startChoiceCopy';
import {
  resolvePaymentLink,
  type ResolvedPaymentLink,
} from '../services/paymentLinkService';
import { createCheckoutSession } from '../services/checkoutService';
import { NotFound } from './NotFound';

const SUBSCRIPTION_NOTE =
  'Each bundle is a subscription: it renews at its own length — every 1, 3 or 6 months — and each renewal is charged up front.';

const CANCELLED_NOTICE =
  "No payment was taken. Pick a bundle whenever you're ready.";

type PaymentLinkResolution = ResolvedPaymentLink | { status: 'loading' };

export function SelectBundle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { demoJourney, journeyForPaymentToken } = useClientJourneys();

  const token = searchParams.get('token') ?? '';
  const [link, setLink] = useState<PaymentLinkResolution>({ status: 'loading' });
  const [startPath, setStartPath] = useState<SubscriptionStartPath | null>(null);
  const [startPathMissing, setStartPathMissing] = useState(false);
  const firstStartOption = useRef<HTMLButtonElement>(null);
  const [opening, setOpening] = useState(false);
  const [cancelledNoticeShown, setCancelledNoticeShown] = useState(
    searchParams.get('payment') === 'cancelled',
  );

  const { paymentLinkState } = appState;

  useEffect(() => {
    if (token.length < 6) {
      setLink({ status: 'invalid' });
      return;
    }

    let current = true;
    setLink({ status: 'loading' });

    resolvePaymentLink(token, paymentLinkState).then((resolved) => {
      if (current) setLink(resolved);
    });

    return () => {
      current = false;
    };
  }, [token, paymentLinkState]);

  if (appState.isWaitlistMode) return <NotFound />;

  const journey = journeyForPaymentToken(token) ?? demoJourney;
  const isLoading = link.status === 'loading';
  const isValidToken = link.status === 'valid';

  const dismissNotice = () => {
    setCancelledNoticeShown(false);
    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    setSearchParams(next, { replace: true });
  };

  const chooseStartPath = (chosen: SubscriptionStartPath) => {
    setStartPath(chosen);
    setStartPathMissing(false);
  };

  const openCheckout = async (bundleId: BundleId) => {
    if (!startPath) {
      setStartPathMissing(true);
      firstStartOption.current?.focus();
      return;
    }

    setOpening(true);

    try {
      const session = await createCheckoutSession(token, {
        bundle: bundleById(bundleId).months,
        startPath,
      });
      navigate(`/checkout/${session.sessionId}`);
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
    <main
      className="w-full min-h-screen bg-surface-page pb-24"
      data-parity-root="SelectBundle"
    >
      <Navbar theme="dark" />

      {!isValidToken && !isLoading && (
        <div
          className="w-full bg-brand text-brand-foreground pt-24 pb-8 px-6 shadow-md relative z-10"
          data-parity="call-first-banner"
        >
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-start md:items-center gap-4">
              <AlertCircle size={32} className="shrink-0 hidden md:block" />
              <div>
                <h2 className="font-serif text-xl md:text-2xl font-medium mb-1">A Call Comes First</h2>
                <p className="text-brand-foreground/90 text-sm md:text-base">
                  You need a unique, secure token from your call with Eli to purchase a 1-on-1 coaching bundle.
                </p>
              </div>
            </div>
            <Link
              to="/book"
              className={buttonVariants({
                corner: 'control',
                size: 'md-wide',
                variant: 'on-brand',
              })}
            >
              <Calendar size={18} />
              Book a Call
            </Link>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-6 ${isValidToken || isLoading ? 'pt-32' : 'pt-16'}`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 tracking-tight">
            Choose Your Bundle
          </h1>
          {isValidToken ? (
            <p className="text-lg text-copy-muted mb-8">
              Based on our call, select the commitment timeframe that works best for you.
            </p>
          ) : isLoading ? (
            <p aria-busy="true" className="text-lg text-copy-muted mb-8" role="status">
              Checking your link…
            </p>
          ) : (
            <p className="text-lg text-link-muted mb-8 italic">
              These bundles are available for purchase exclusively after your call with Eli.
            </p>
          )}

          {cancelledNoticeShown && (
            <div
              className="mx-auto flex max-w-xl items-start gap-3 rounded-control border border-border-subtle bg-surface-base px-4 py-3 text-left"
              data-parity="cancelled-notice"
              role="status"
            >
              <p className="flex-1 text-sm text-text-secondary">{CANCELLED_NOTICE}</p>
              <Button
                aria-label="Dismiss"
                className="-mr-2 -mt-1 h-8 w-8 px-0 text-text-secondary hover:bg-surface-quiet hover:text-text-primary"
                onClick={dismissNotice}
                variant="outline"
              >
                <X aria-hidden="true" size={16} />
              </Button>
            </div>
          )}
        </div>

        {!isLoading && (
          <div className={!isValidToken ? 'opacity-50 grayscale-[0.5] pointer-events-none' : ''}>
            <BundleSelector
              mode="checkout"
              pricing={journey.pricing}
              onCheckout={openCheckout}
              disabled={!isValidToken}
              busy={opening}
              note={SUBSCRIPTION_NOTE}
              beforeCheckout={
                <StartChoice
                  error={startPathMissing ? START_CHOICE_REQUIRED : null}
                  firstOptionRef={firstStartOption}
                  onChange={chooseStartPath}
                  value={startPath}
                />
              }
            />
          </div>
        )}
      </div>
    </main>
    <LegalFooter />
    </>
  );
}
