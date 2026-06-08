import { Navbar } from '../components/Navbar';
import { BundleSelector } from '../components/BundleSelector';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from '../components/waitlist/WaitlistEmailForm';

export function Pricing() {
  const { appState } = useAppState();

  return (
    <main className="w-full min-h-screen bg-[#FAFAFA] pb-24">
      <Navbar theme="dark" />

      <div className="max-w-7xl mx-auto px-6 pt-32">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#121212] mb-6 tracking-tight">
            Coaching Plans
          </h1>
          <p className="text-lg text-neutral-600 mb-8">
            {appState.isWaitlistMode
              ? 'Join the waitlist and lock in reduced pricing on every coaching plan.'
              : 'Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support.'}
          </p>
        </div>

        <BundleSelector mode="public" waitlistMode={appState.isWaitlistMode} />

        <p className="max-w-2xl mx-auto text-center text-sm text-neutral-600 mb-14">
          You may cancel within the first 14 days if coaching is not the right fit. After that, the full plan commitment applies.
        </p>

        <div className="max-w-4xl mx-auto text-center bg-white p-8 md:p-12 rounded-2xl border border-neutral-100 shadow-sm">
          {appState.isWaitlistMode ? (
            <>
              <h3 className="font-serif text-2xl text-[#121212] mb-4">Interested in the waitlist price?</h3>
              <p className="text-neutral-600 mb-8">
                Leave your email and you'll be the first to know when spots open.
              </p>
              <WaitlistEmailForm variant="light" />
            </>
          ) : (
            <>
              <h3 className="font-serif text-2xl text-[#121212] mb-4">Ready to start?</h3>
              <p className="text-neutral-600 mb-8">
                To ensure we're the perfect fit, all 1-on-1 coaching begins with a complimentary assessment call. During this call, we'll discuss your goals and lay out a roadmap for your success.
              </p>
              <Link
                to="/book"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#C81D6B] text-white font-medium rounded-sm hover:bg-[#a31556] transition-colors shadow-md"
              >
                Book Assessment Call <ArrowRight size={18} />
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}