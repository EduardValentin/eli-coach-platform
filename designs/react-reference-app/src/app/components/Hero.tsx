import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { useAppState } from '../context/AppContext';
import { WaitlistEmailForm } from './waitlist/WaitlistEmailForm';
import { WaitlistAvailabilityStatus } from './waitlist/WaitlistAvailabilityStatus';

const HERO_MEDIA_ROOT = `${import.meta.env.BASE_URL}media/hero/`;
const UPRIGHT_SCREEN_MEDIA_QUERY = '(orientation: portrait)';
const HERO_PORTRAIT_POSTER = {
  src: `${HERO_MEDIA_ROOT}hero-studio-poster-portrait.webp`,
  width: 720,
  height: 1280,
};
const HERO_LANDSCAPE_POSTER = {
  src: `${HERO_MEDIA_ROOT}hero-studio-poster-landscape.webp`,
  width: 1600,
  height: 900,
};
const HERO_PORTRAIT_VIDEO_SRC = `${HERO_MEDIA_ROOT}hero-studio-loop-portrait.h264.mp4`;
const HERO_LANDSCAPE_VIDEO_SRC = `${HERO_MEDIA_ROOT}hero-studio-loop-landscape.h264.mp4`;

const heroFootageLayerClassName = 'absolute inset-0 w-full h-full object-cover';

const heroControlClassName =
  'inline-flex size-(--size-control-md) items-center justify-center rounded-full transition-colors hover:text-surface-inverted-foreground';

function HeroPosterPicture() {
  return (
    <picture data-parity="hero-poster">
      <source
        media={UPRIGHT_SCREEN_MEDIA_QUERY}
        srcSet={HERO_PORTRAIT_POSTER.src}
        type="image/webp"
        width={HERO_PORTRAIT_POSTER.width}
        height={HERO_PORTRAIT_POSTER.height}
      />
      <img
        data-parity="hero-poster-image"
        alt=""
        src={HERO_LANDSCAPE_POSTER.src}
        width={HERO_LANDSCAPE_POSTER.width}
        height={HERO_LANDSCAPE_POSTER.height}
        className={heroFootageLayerClassName}
      />
    </picture>
  );
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion() === true;
  const [playRequested, setPlayRequested] = useState(true);
  const isPlaying = !shouldReduceMotion && playRequested;
  const { appState } = useAppState();
  const isClosed = appState.waitlistAvailability === 'closed';
  const isUnavailable = appState.waitlistAvailability === null;

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!isPlaying) {
      video.pause();
      return;
    }

    void video.play().catch(() => setPlayRequested(false));
  }, [isPlaying]);

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }

    setPlayRequested(true);
  };

  return (
    <section data-parity-root="Hero" data-surface="inverted" className="relative w-full min-h-[max(100vh,600px)] flex items-center justify-center overflow-hidden bg-surface-inverted">
      <div aria-hidden="true" data-parity="hero-media" className="absolute inset-0 w-full h-full">
        <div data-parity="hero-footage" className="absolute inset-0 opacity-60">
          <HeroPosterPicture />
          <video
            ref={videoRef}
            data-parity="hero-video"
            autoPlay={isPlaying}
            loop
            muted
            playsInline
            className={heroFootageLayerClassName}
          >
            {shouldReduceMotion ? null : (
              <>
                <source media={UPRIGHT_SCREEN_MEDIA_QUERY} src={HERO_PORTRAIT_VIDEO_SRC} type="video/mp4" />
                <source src={HERO_LANDSCAPE_VIDEO_SRC} type="video/mp4" />
              </>
            )}
          </video>
        </div>
        <div data-parity="hero-gradient" className="absolute inset-0 bg-gradient-to-t from-surface-inverted via-transparent to-transparent" />
        <div data-parity="hero-dim" className="absolute inset-0 bg-surface-inverted/55" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-[min(1.5rem,24px)] py-[calc(var(--size-control-md)+2rem)] w-full">
        <AnimatePresence mode="wait">
          {appState.isWaitlistMode ? (
            <motion.div
              key="waitlist"
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

              <h1 className="text-surface-inverted-foreground text-display-md min-[360px]:text-4xl sm:text-5xl md:text-7xl leading-none text-balance font-serif font-medium mb-4">
                Coaching built around your body.
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
                className="text-text-inverted-secondary text-lg md:text-xl font-light tracking-wide mb-10 max-w-2xl"
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

            </motion.div>
          ) : (
            <motion.div
              key="default"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-surface-inverted-foreground text-display-md min-[360px]:text-4xl sm:text-5xl md:text-7xl leading-none text-balance font-serif font-medium mb-4">
                Strength training for women.
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="text-text-inverted-secondary text-lg md:text-xl font-light tracking-wide mb-8"
              >
                Coaching with Eli — strength, nutrition, and a plan that takes your cycle into account.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <Button asChild size="md-grow" elevation="raised" lettering="caps" press="scale" textSize="sm" weight="semibold" className="group">
                  <Link to="/book">
                    See if we’re a fit
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <p className="text-text-inverted-secondary text-sm font-light tracking-wide">
                  Free 30-minute call.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div data-parity="hero-controls" className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-surface-inverted-foreground/70">
        <button
          type="button"
          onClick={() => setPlayRequested(!isPlaying)}
          className={heroControlClassName}
          aria-label={isPlaying ? 'Pause hero video' : 'Play hero video'}
        >
          {isPlaying ? <Pause aria-hidden="true" size={20} /> : <Play aria-hidden="true" size={20} />}
        </button>
        <button type="button" onClick={restartVideo} className={heroControlClassName} aria-label="Restart hero video">
          <RotateCcw aria-hidden="true" size={20} />
        </button>
      </div>
    </section>
  );
}
