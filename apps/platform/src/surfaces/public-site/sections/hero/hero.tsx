import { joinBasePath } from "@eli-coach-platform/config";
import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { MotionConfig, motion, type Transition } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { cn } from "@eli-coach-platform/ui/lib";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import { WaitlistAvailabilityStatus } from "~/features/waitlist/ui/public/availability-status";
import { WaitlistEmailForm } from "~/features/waitlist/ui/public/email-form";
import { PRICING_PATH } from "~/surfaces/public-site/paths";
import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";

const HERO_VIDEO_LOAD_DELAY_MS = 1200;
const HERO_VIDEO_POSTER_SOURCE = joinBasePath(
  import.meta.env.BASE_URL,
  "media/hero/hero-training-poster.jpg",
);
const HERO_VIDEO_SOURCES = [
  {
    src: joinBasePath(
      import.meta.env.BASE_URL,
      "media/hero/hero-training-loop.webm",
    ),
    type: "video/webm",
  },
  {
    src: joinBasePath(
      import.meta.env.BASE_URL,
      "media/hero/hero-training-loop.mp4",
    ),
    type: "video/mp4",
  },
];

type PublicHeroProps = {
  botDetection: BotDetectionConfig;
  waitlist: WaitlistPresentation;
};

function isDataSaverEnabled() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;

  return connection?.saveData === true;
}

function useShouldLoadHeroVideo() {
  const prefersReducedMotion = useClientReducedMotionPreference();
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion || isDataSaverEnabled()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldLoadVideo(true);
    }, HERO_VIDEO_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  return shouldLoadVideo;
}

export function PublicHero(props: PublicHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useClientReducedMotionPreference();
  const shouldLoadVideo = useShouldLoadHeroVideo();
  const [playRequested, setPlayRequested] = useState(true);
  const isPlaying = !shouldReduceMotion && playRequested;
  const { isClosed, isUnavailable, mode } = props.waitlist;

  useEffect(() => {
    if (!videoRef.current || !shouldLoadVideo) {
      return;
    }

    if (!isPlaying) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => {
      setPlayRequested(false);
    });
  }, [isPlaying, shouldLoadVideo]);

  const pauseVideo = () => {
    videoRef.current?.pause();
    setPlayRequested(false);
  };

  const playVideo = () => {
    setPlayRequested(true);
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;

      if (!shouldReduceMotion) {
        void videoRef.current.play().catch(() => {
          setPlayRequested(false);
        });
      }
    }

    setPlayRequested(true);
  };

  return (
    <section
      className="relative flex h-screen min-h-[600px] w-full items-center justify-center overflow-hidden bg-surface-inverted"
      data-surface="inverted"
    >
      <MotionConfig reducedMotion="user">
        <div aria-hidden="true" className="absolute inset-0 h-full w-full">
          <video
            ref={videoRef}
            autoPlay={shouldLoadVideo && isPlaying}
            className="h-full w-full object-cover opacity-60"
            loop
            muted
            playsInline
            poster={HERO_VIDEO_POSTER_SOURCE}
            preload="none"
          >
            {shouldLoadVideo
              ? HERO_VIDEO_SOURCES.map((source) => (
                  <source
                    key={source.type}
                    src={source.src}
                    type={source.type}
                  />
                ))
              : null}
          </video>
          <div className="absolute inset-0 bg-linear-to-t from-surface-inverted via-transparent to-transparent" />
          <div className="absolute inset-0 bg-surface-inverted/30" />
        </div>

        <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 text-center">
          {props.waitlist.mode !== "disabled" ? (
            <div className="flex w-full flex-col items-center">
              {isClosed ? (
                <motion.span
                  className="mb-4 inline-block text-sm font-medium uppercase tracking-section-eyebrow text-text-inverted/70"
                  {...heroEntranceMotion({
                    riseDistance: 10,
                    transition: { duration: 0.6, ease: "easeOut" },
                  })}
                >
                  This round is full
                </motion.span>
              ) : null}
              <h1 className={heroHeadingClassName}>
                Coaching built around your body.
              </h1>
              <motion.p
                className="mb-10 max-w-2xl text-lg font-light tracking-wide text-text-inverted-secondary md:text-xl"
                {...heroEntranceMotion({
                  transition: {
                    delay: 0.25,
                    duration: 0.8,
                    ease: "easeOut",
                  },
                })}
              >
                {isClosed ? (
                  "Leave your email — I'll let you know when new spots open."
                ) : isUnavailable ? (
                  "Join the waitlist to hear when coaching opens."
                ) : (
                  <>
                    Strength, nutrition, and cycle-aware coaching, with{" "}
                    <Link
                      className="underline decoration-text-inverted/40 underline-offset-4 transition-colors hover:decoration-text-inverted"
                      to={PRICING_PATH}
                    >
                      reduced pricing
                    </Link>{" "}
                    for early signups.
                  </>
                )}
              </motion.p>
              <motion.div
                className="mb-6 w-full"
                {...heroEntranceMotion({
                  transition: {
                    delay: 0.4,
                    duration: 0.8,
                    ease: "easeOut",
                  },
                })}
              >
                <WaitlistEmailForm
                  botDetection={props.botDetection}
                  mode={mode}
                  variant="dark"
                />
              </motion.div>
              <motion.div
                className="mb-6 w-full"
                {...heroEntranceMotion({
                  transition: {
                    delay: 0.55,
                    duration: 0.8,
                    ease: "easeOut",
                  },
                })}
              >
                <WaitlistAvailabilityStatus
                  status={props.waitlist.availabilityStatus}
                  variant="dark"
                />
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <h1 className={heroHeadingClassName}>
                Strength training for women.
              </h1>
              <motion.p
                className="mb-8 text-lg font-light tracking-wide text-text-inverted-secondary md:text-xl"
                {...heroEntranceMotion({
                  transition: {
                    delay: 0.2,
                    duration: 0.8,
                    ease: "easeOut",
                  },
                })}
              >
                Coaching with Eli — strength, nutrition, and a plan that takes
                your cycle into account.
              </motion.p>
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div>
                  <Link
                    className={cn(
                      buttonVariants({
                        elevation: "raised",
                        lettering: "caps",
                        press: "scale",
                        textSize: "sm",
                        weight: "semibold",
                      }),
                      "group",
                    )}
                    to={BOOK_PATH}
                  >
                    See if we’re a fit
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </div>
                <p className="text-sm font-light tracking-wide text-text-inverted-secondary">
                  Free 30-minute call.
                </p>
              </motion.div>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-6 text-text-inverted/70">
          <button
            aria-label={isPlaying ? "Pause hero video" : "Play hero video"}
            className="transition-colors hover:text-text-inverted"
            onClick={isPlaying ? pauseVideo : playVideo}
            type="button"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" size={20} />
            ) : (
              <Play aria-hidden="true" size={20} />
            )}
          </button>
          <button
            aria-label="Restart hero video"
            className="transition-colors hover:text-text-inverted"
            onClick={restartVideo}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={20} />
          </button>
        </div>
      </MotionConfig>
    </section>
  );
}

const heroHeadingClassName =
  "mb-4 font-heading text-display-md font-medium leading-none text-balance text-text-inverted min-[360px]:text-4xl sm:text-5xl md:text-7xl";

function heroEntranceMotion(options: {
  transition: Transition;
  riseDistance?: number;
}) {
  return {
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: options.riseDistance ?? 20 },
    transition: options.transition,
  };
}
