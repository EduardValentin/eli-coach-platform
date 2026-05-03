import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Button } from './ThemeButton';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from './waitlist/WaitlistEmailForm';

export function MidPageCTA() {
  const { appState } = useAppState();

  return (
    <section className="py-14 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-xl mx-auto px-6 text-center motion-reduce:transform-none"
      >
        {appState.isWaitlistMode ? (
          <>
            <p className="text-base text-muted-foreground mb-5">
              Like what you're reading? Get on the list.
            </p>
            <WaitlistEmailForm variant="light" />
          </>
        ) : (
          <>
            <p className="text-base text-muted-foreground mb-5">
              Like what you're reading?
            </p>
            <Link to="/book" className="inline-block">
              <Button size="lg" variant="primary" className="px-8">
                Start my plan
              </Button>
            </Link>
          </>
        )}
      </motion.div>
    </section>
  );
}
