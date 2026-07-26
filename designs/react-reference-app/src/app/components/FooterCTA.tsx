import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { Button } from './ThemeButton';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from './waitlist/WaitlistEmailForm';
import { WaitlistAvailabilityStatus } from './waitlist/WaitlistAvailabilityStatus';

export function FooterCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isTextInView = useInView(textRef, { once: true, amount: 0.2 });
  const { appState } = useAppState();
  const isClosed = appState.waitlistAvailability === 'closed';
  const isUnavailable = appState.waitlistAvailability === null;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end end'],
  });

  // Sheet slides up with scroll — clamp manually to prevent overshoot
  const sheetY = useTransform(scrollYProgress, (v) => {
    const progress = Math.min(v / 0.7, 1);
    return 140 * (1 - progress);
  });
  const sheetScale = useTransform(scrollYProgress, (v) => {
    const progress = Math.min(v / 0.7, 1);
    return 0.97 + 0.03 * progress;
  });

  return (
    <section ref={sectionRef} className="relative -mt-10 z-10">
      <motion.div
        style={{ y: sheetY, scale: sheetScale }}
        className="bg-surface-brand-soft rounded-t-phone-frame shadow-public-footer-cta-sheet text-foreground py-28 px-6 text-center"
      >
        <motion.div
          ref={textRef}
          initial={{ opacity: 0, y: 40 }}
          animate={isTextInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          {appState.isWaitlistMode ? (
            <>
              <h2 className="text-public-footer-cta-heading-sm md:text-public-footer-cta-heading-md font-serif font-medium mb-6 text-brand">
                {isClosed
                  ? 'This round filled up fast.'
                  : isUnavailable
                    ? 'Join the waitlist'
                    : "Don't miss your spot"}
              </h2>
              <p className="text-lg text-copy-muted mb-10 max-w-xl mx-auto">
                {isClosed
                  ? "Leave your email and you'll be first to know when the next spots open."
                  : isUnavailable
                    ? "Leave your email and you'll be first to know when coaching opens."
                    : "Join the waiting list and you'll be first to know when coaching opens — plus reduced pricing on every plan, reserved for early signups."}
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isTextInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <WaitlistEmailForm
                  availability={appState.waitlistAvailability}
                  variant="light"
                />
                <WaitlistAvailabilityStatus
                  availability={appState.waitlistAvailability}
                  outageAnnouncement="none"
                  variant="light"
                />
              </motion.div>
            </>
          ) : (
            <>
              <h2 className="text-public-footer-cta-heading-sm md:text-public-footer-cta-heading-md font-serif font-medium mb-6 text-brand">
                Not ready for 1-on-1 coaching?
              </h2>
              <p className="text-lg text-copy-muted mb-10 max-w-xl mx-auto">
                That's okay. Start feeling better today — free workout challenges, recipes, and e-books, no card needed.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isTextInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
                  Get the free starter pack
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                  See coaching plans
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
