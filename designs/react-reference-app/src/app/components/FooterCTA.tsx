import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { Button } from './ThemeButton';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from './waitlist/WaitlistEmailForm';
import { SpotCounter } from './waitlist/SpotCounter';

export function FooterCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isTextInView = useInView(textRef, { once: true, amount: 0.2 });
  const { appState } = useAppState();

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
        className="bg-[#FFF5F8] rounded-t-[2.5rem] shadow-[0_-20px_60px_-10px_rgba(200,29,107,0.15)] text-neutral-900 py-28 px-6 text-center"
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
              <h2 className="text-3xl md:text-4xl font-serif font-medium mb-6 text-[#C81D6B]">
                Don't miss your spot
              </h2>
              <p className="text-lg text-neutral-600 mb-10 max-w-xl mx-auto">
                Join the waiting list and you'll be first to know when the 12-month program opens — plus a launch discount reserved only for early signups.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isTextInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <WaitlistEmailForm variant="light" />
                <SpotCounter variant="light" />
              </motion.div>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-serif font-medium mb-6 text-[#C81D6B]">
                Not ready for 1-on-1 coaching?
              </h2>
              <p className="text-lg text-neutral-600 mb-10 max-w-xl mx-auto">
                That's okay. You can start feeling better today with our free workout challenges, recipes, and e-books.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isTextInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
                  Explore Free Products
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                  View Paid Plans
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
