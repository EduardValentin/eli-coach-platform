import { joinBasePath } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/contracts";
import { cn, IconButton } from "@eli-coach-platform/ui";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

import { WaitlistAvailabilityStatus } from "../waitlist/waitlist-availability-status";
import { WaitlistEmailForm } from "../waitlist/waitlist-email-form";
import { marketingEase, useClientReducedMotionPreference } from "../marketing-motion";

const HERO_VIDEO_LOAD_DELAY_MS = 1200;
const HERO_VIDEO_POSTER_SOURCE = joinBasePath(
  import.meta.env.BASE_URL,
  "media/hero/hero-training-poster.jpg",
);
const HERO_VIDEO_SOURCES = [
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.webm"),
    type: "video/webm",
  },
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.mp4"),
    type: "video/mp4",
  },
];

type MarketingHeroProps = {
  botDetectionConfig: BotDetectionConfig;
  waitlist: Waitlist;
};

type HeroEntranceStyle = "slide" | "pop" | "fade";

function isDataSaverEnabled() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

  return connection?.saveData === true;
}

function useShouldLoadHeroVideo(prefersReducedMotion: boolean) {
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

export function MarketingHero(props: MarketingHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useClientReducedMotionPreference();
  const shouldLoadVideo = useShouldLoadHeroVideo(shouldReduceMotion);
  const [playRequested, setPlayRequested] = useState(true);
  const isPlaying = !shouldReduceMotion && playRequested;
  const isClosed = props.waitlist.availability === "closed";

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
    <section className="relative flex h-screen min-h-[600px] w-full items-center justify-center overflow-hidden bg-surface-inverted px-6 text-center text-text-inverted">
      <div aria-hidden="true" className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay={shouldLoadVideo && isPlaying}
          className="size-full object-cover opacity-60"
          loop
          muted
          playsInline
          poster={HERO_VIDEO_POSTER_SOURCE}
          preload="none"
        >
          {shouldLoadVideo
            ? HERO_VIDEO_SOURCES.map((source) => (
                <source key={source.type} src={source.src} type={source.type} />
              ))
            : null}
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-inverted via-surface-inverted/40 to-overlay-strong" />
        <div className="absolute inset-0 bg-surface-inverted/30" />
      </div>

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-6 text-text-inverted/70">
        <IconButton
          aria-label={isPlaying ? "Pause hero video" : "Play hero video"}
          className="size-5 p-0"
          onClick={isPlaying ? pauseVideo : playVideo}
          variant="inverted"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" size={20} />
          ) : (
            <Play aria-hidden="true" size={20} />
          )}
        </IconButton>
        <IconButton
          aria-label="Restart hero video"
          className="size-5 p-0"
          onClick={restartVideo}
          variant="inverted"
        >
          <RotateCcw aria-hidden="true" size={20} />
        </IconButton>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center py-32">
        {props.waitlist.enabled ? (
          <HeroPanel
            eyebrow={isClosed ? "This round is full" : undefined}
            className="w-full"
            heading="Coaching built around your body."
            headingClassName="max-w-7xl"
            paragraph={
              isClosed
                ? "Leave your email — I'll let you know when new spots open."
                : props.waitlist.availability === null
                  ? "Join the waitlist to hear when coaching opens."
                : (
                  <>
                    Strength, nutrition, and cycle-aware coaching, with{" "}
                    <Link
                      className="underline decoration-text-inverted/40 underline-offset-4 transition-colors duration-150 ease-out hover:decoration-text-inverted"
                      to="/pricing"
                    >
                      reduced pricing
                    </Link>
                    {" for early signups."}
                  </>
                )
            }
            paragraphClassName="mb-10"
            paragraphDelayMs={250}
            shouldReduceMotion={shouldReduceMotion}
          >
            <motion.div
              className="mb-6 w-full"
              {...getHeroEntranceMotionProps({
                delayMs: 400,
                shouldReduceMotion,
              })}
            >
              <WaitlistEmailForm
                availability={props.waitlist.availability}
                botDetectionConfig={props.botDetectionConfig}
                variant="dark"
              />
            </motion.div>
            <motion.div
              className="mb-6 w-full"
              {...getHeroEntranceMotionProps({
                delayMs: 550,
                shouldReduceMotion,
              })}
            >
              <WaitlistAvailabilityStatus
                availability={props.waitlist.availability}
                variant="dark"
              />
            </motion.div>
          </HeroPanel>
        ) : (
          <HeroPanel
            className="w-full max-w-7xl"
            heading="Strength training for women."
            paragraph="Coaching with Eli — strength, nutrition, and a plan that takes your cycle into account."
            paragraphClassName="mb-8 max-w-none"
            paragraphDelayMs={200}
            shouldReduceMotion={shouldReduceMotion}
          >
            <motion.div
              {...getHeroEntranceMotionProps({
                delayMs: 400,
                shouldReduceMotion,
                style: "pop",
              })}
            >
              <Link
                className="group inline-flex h-12 items-center justify-center rounded-public-footer-cta-control bg-brand-primary px-8 text-sm font-semibold text-text-inverted uppercase tracking-widest shadow-md transition-all hover:bg-waitlist-button-hover hover:shadow-lg active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                to="/book"
              >
                See if we’re a fit
                <ChevronRight
                  aria-hidden="true"
                  className="ml-1 size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </motion.div>
          </HeroPanel>
        )}
      </div>
    </section>
  );
}

type HeroPanelProps = PropsWithChildren<{
  className?: string;
  eyebrow?: string;
  heading: string;
  headingClassName?: string;
  paragraph: ReactNode;
  paragraphClassName?: string;
  paragraphDelayMs: number;
  shouldReduceMotion: boolean;
}>;

function HeroPanel(props: HeroPanelProps) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={cn("flex flex-col items-center", props.className)}
      initial={props.shouldReduceMotion ? false : { opacity: 0 }}
      transition={{ duration: 0.4, ease: marketingEase }}
    >
      {props.eyebrow ? (
        <motion.span
          className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.2em] text-text-inverted/70"
          {...getHeroEntranceMotionProps({
            delayMs: 0,
            shouldReduceMotion: props.shouldReduceMotion,
            style: "fade",
          })}
        >
          {props.eyebrow}
        </motion.span>
      ) : null}
      <motion.h1
        className={cn(
          "mb-4 font-heading text-[2rem] font-medium leading-none text-balance text-text-inverted min-[360px]:text-[2.25rem] sm:text-5xl md:text-7xl",
          props.headingClassName,
        )}
        {...getHeroEntranceMotionProps({
          delayMs: props.eyebrow ? 100 : 0,
          shouldReduceMotion: props.shouldReduceMotion,
        })}
      >
        {props.heading}
      </motion.h1>
      <motion.p
        className={cn(
          "max-w-2xl text-lg font-light leading-7 tracking-nav text-gray-200 md:text-xl md:leading-7",
          props.paragraphClassName,
        )}
        {...getHeroEntranceMotionProps({
          delayMs: props.paragraphDelayMs,
          shouldReduceMotion: props.shouldReduceMotion,
        })}
      >
        {props.paragraph}
      </motion.p>
      {props.children}
    </motion.div>
  );
}

function getHeroEntranceMotionProps(options: {
  delayMs: number;
  shouldReduceMotion: boolean;
  style?: HeroEntranceStyle;
}) {
  const { delayMs, shouldReduceMotion, style = "slide" } = options;

  if (shouldReduceMotion) {
    return {
      animate: { opacity: 1 },
      initial: false,
      transition: { duration: 0 },
    };
  }

  if (style === "fade") {
    return {
      animate: { opacity: 1 },
      initial: { opacity: 0 },
      transition: { delay: delayMs / 1000, duration: 0.8, ease: marketingEase },
    };
  }

  if (style === "pop") {
    return {
      animate: { opacity: 1, scale: 1 },
      initial: { opacity: 0, scale: 0.9 },
      transition: { delay: delayMs / 1000, duration: 0.5, ease: marketingEase },
    };
  }

  return {
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: 20 },
    transition: { delay: delayMs / 1000, duration: 0.8, ease: marketingEase },
  };
}
