import { Navbar } from '../components/Navbar';
import { BundleSelector } from '../components/BundleSelector';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from '../components/waitlist/WaitlistEmailForm';
import { WaitlistAvailabilityStatus } from '../components/waitlist/WaitlistAvailabilityStatus';
import { LegalFooter } from '../components/legal/LegalNav';

export function Pricing() {
  const { appState } = useAppState();
  const showsWaitlistPricing =
    appState.isWaitlistMode &&
    (appState.waitlistAvailability === 'available' ||
      appState.waitlistAvailability === 'limited');
  const usesNeutralWaitlistCopy =
    appState.waitlistAvailability === 'closed' ||
    appState.waitlistAvailability === null;

  return (
    <>
    <main className="w-full min-h-screen bg-surface-page pb-24">
      <Navbar theme="dark" />

      <div className="max-w-7xl mx-auto px-6 pt-32">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 tracking-tight">
            Coaching Plans
          </h1>
          <p className="text-lg text-copy-muted mb-8">
            {appState.isWaitlistMode
              ? showsWaitlistPricing
                ? 'Join the waitlist and lock in reduced pricing on every coaching plan.'
                : 'Join the waitlist to hear when coaching opens.'
              : 'Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support.'}
          </p>
        </div>

        <BundleSelector mode="public" waitlistMode={showsWaitlistPricing} />

        <p className="max-w-2xl mx-auto text-center text-sm text-copy-muted mb-14">
          On the 3- and 6-month plans, you may cancel within the first 7 days if coaching is not the right fit. After that, the full plan commitment applies.
        </p>

        <div className="max-w-4xl mx-auto text-center bg-card p-8 md:p-12 rounded-2xl border border-stroke-faint shadow-sm">
          {appState.isWaitlistMode ? (
            <>
              <h2 className="font-serif text-2xl text-foreground mb-4">
                {usesNeutralWaitlistCopy
                  ? 'Join the coaching waitlist'
                  : 'Interested in the waitlist price?'}
              </h2>
              <p className="text-copy-muted mb-8">
                Leave your email and you'll be the first to know when spots open.
              </p>
              <WaitlistEmailForm
                availability={appState.waitlistAvailability}
                variant="light"
              />
              <div className="mt-6">
                <WaitlistAvailabilityStatus
                  availability={appState.waitlistAvailability}
                  variant="light"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-foreground mb-4">Ready to start?</h2>
              <p className="text-copy-muted mb-8">
                To ensure we're the perfect fit, all 1-on-1 coaching begins with a complimentary assessment call. During this call, we'll discuss your goals and lay out a roadmap for your success.
              </p>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand text-brand-foreground font-medium rounded-sm hover:bg-brand-hover transition-colors shadow-md"
              >
                Book Assessment Call <ArrowRight size={18} />
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
    <LegalFooter />
    </>
  );
}
