import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from './ThemeButton';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from './waitlist/WaitlistEmailForm';
import { WaitlistAvailabilityStatus } from './waitlist/WaitlistAvailabilityStatus';

export function Hero() {
  const [isPlaying, setIsPlaying] = useState(true);
  const { appState } = useAppState();
  const isClosed = appState.waitlistAvailability === 'closed';
  const isUnavailable = appState.waitlistAvailability === null;

  return (
    <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-surface-inverted">
      {/* Background Media Placeholder */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="https://images.unsplash.com/photo-1594269807754-7b7926246d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZpdG5lc3MlMjB0cmFpbmluZyUyMHN0cm9uZ3xlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Woman training with kettlebell"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-inverted via-transparent to-transparent" />
        <div className="absolute inset-0 bg-surface-inverted/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full">
        <AnimatePresence mode="wait">
          {appState.isWaitlistMode ? (
            <motion.div
              key="waitlist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center w-full"
            >
              {isClosed && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="inline-block text-sm uppercase tracking-section-eyebrow text-surface-inverted-foreground/70 font-medium mb-4"
                >
                  This round is full
                </motion.span>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                className="text-surface-inverted-foreground text-[2rem] min-[360px]:text-[2.25rem] sm:text-5xl md:text-7xl leading-none text-balance font-serif font-medium mb-4"
              >
                Coaching built around your body.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
                className="text-gray-200 text-lg md:text-xl font-light tracking-wide mb-10 max-w-2xl"
              >
                {isClosed
                  ? "Leave your email — I'll let you know when new spots open."
                  : isUnavailable
                    ? 'Join the waitlist to hear when coaching opens.'
                    : (<>Strength, nutrition, and cycle-aware coaching, with{' '}
                      <Link to="/pricing" className="underline underline-offset-4 decoration-surface-inverted-foreground/40 hover:decoration-surface-inverted-foreground transition-colors">
                        reduced pricing
                      </Link>{' '}
                      for early signups.
                    </>)}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                className="w-full mb-6"
              >
                <WaitlistEmailForm
                  availability={appState.waitlistAvailability}
                  variant="dark"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
                className="w-full mb-6"
              >
                <WaitlistAvailabilityStatus
                  availability={appState.waitlistAvailability}
                  variant="dark"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-gray-400 text-xs tracking-wide"
              >
                Waitlist and coaching updates only.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="text-surface-inverted-foreground text-[2rem] min-[360px]:text-[2.25rem] sm:text-5xl md:text-7xl leading-none text-balance font-serif font-medium mb-4"
              >
                Strength training for women.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="text-gray-200 text-lg md:text-xl font-light tracking-wide mb-8"
              >
                Coaching with Eli — strength, nutrition, and a plan that takes your cycle into account.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link to="/book" className="inline-block">
                  <Button size="lg" variant="primary" className="group uppercase tracking-widest text-sm font-semibold">
                    See if we’re a fit
                    <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Controls Mock */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 text-surface-inverted-foreground/70">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="hover:text-surface-inverted-foreground transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="hover:text-surface-inverted-foreground transition-colors" aria-label="Restart">
          <RotateCcw size={20} />
        </button>
      </div>
    </section>
  );
}
