import { joinBasePath } from "@eli-coach-platform/config";
import type { Waitlist } from "@eli-coach-platform/domain";
import { Button, cn } from "@eli-coach-platform/ui";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SpotCounter } from "./spot-counter";
import { WaitlistEmailForm } from "./waitlist-email-form";

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
  waitlist: Waitlist;
};

type HeroEntranceDelay = "0" | "150" | "200" | "300" | "400" | "450" | "600";
type HeroEntranceStyle = "slide" | "pop" | "fade";

function getHeroEntranceClassName(options: {
  className?: string;
  delay: HeroEntranceDelay;
  style?: HeroEntranceStyle;
}) {
  return cn(
    "ui-public-hero-entrance",
    `ui-public-hero-entrance-delay-${options.delay}`,
    {
      "ui-public-hero-entrance-pop": options.style === "pop",
      "ui-public-hero-entrance-fade": options.style === "fade",
    },
    options.className,
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      setPrefersReducedMotion(motionQuery.matches);
    };

    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  return prefersReducedMotion;
}

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
    setShouldLoadVideo(false);

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
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoadVideo = useShouldLoadHeroVideo(prefersReducedMotion);
  const [isPlaying, setIsPlaying] = useState(true);
  const [spotsRemaining, setSpotsRemaining] = useState(props.waitlist.spotsRemaining);

  useEffect(() => {
    if (!prefersReducedMotion) {
      return;
    }

    setIsPlaying(false);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!videoRef.current || !shouldLoadVideo) {
      return;
    }

    if (!isPlaying) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => {
      setIsPlaying(false);
    });
  }, [isPlaying, shouldLoadVideo]);

  const pauseVideo = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const playVideo = () => {
    setIsPlaying(true);
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }

    setIsPlaying(true);
  };

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface-inverted px-6 text-center text-text-inverted">
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

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 text-text-inverted/80">
        <button
          aria-label={isPlaying ? "Pause hero video" : "Play hero video"}
          className="inline-flex size-11 items-center justify-center rounded-pill transition-colors duration-150 ease-out hover:text-text-inverted"
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
          className="inline-flex size-11 items-center justify-center rounded-pill transition-colors duration-150 ease-out hover:text-text-inverted"
          onClick={restartVideo}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={20} />
        </button>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center py-32">
        {props.waitlist.enabled ? (
          <div className="ui-public-hero-panel flex w-full flex-col items-center">
            <h1
              className={getHeroEntranceClassName({
                className:
                  "mb-4 max-w-4xl font-heading text-[2.75rem] font-medium leading-tight text-text-inverted sm:text-[3.5rem] lg:text-[4.75rem]",
                delay: "0",
              })}
            >
              Something good is coming
            </h1>
            <p
              className={getHeroEntranceClassName({
                className:
                  "mb-10 max-w-2xl text-body-lg font-regular leading-body text-text-inverted/90 md:text-xl",
                delay: "150",
              })}
            >
              I'm opening {props.waitlist.cap} spots for my 12-month coaching program - at a
              price that won't come back.
            </p>
            <div
              className={getHeroEntranceClassName({
                className: "mb-6 w-full",
                delay: "300",
              })}
            >
              <WaitlistEmailForm
                cap={props.waitlist.cap}
                onSpotsRemainingChange={setSpotsRemaining}
                spotsRemaining={spotsRemaining}
                variant="dark"
              />
            </div>
            <div
              className={getHeroEntranceClassName({
                className: "mb-6 w-full",
                delay: "450",
              })}
            >
              <SpotCounter cap={props.waitlist.cap} spotsRemaining={spotsRemaining} variant="dark" />
            </div>
            <p
              className={getHeroEntranceClassName({
                className: "text-label font-medium uppercase tracking-wide text-text-inverted/70",
                delay: "600",
                style: "fade",
              })}
            >
              No spam. Just one email when doors open.
            </p>
          </div>
        ) : (
          <div className="ui-public-hero-panel flex max-w-4xl flex-col items-center">
            <h1
              className={getHeroEntranceClassName({
                className:
                  "mb-4 font-heading text-[2.75rem] font-medium leading-tight text-text-inverted sm:text-[3.5rem] lg:text-[4.75rem]",
                delay: "0",
              })}
            >
              Strength training for women.
            </h1>
            <p
              className={getHeroEntranceClassName({
                className: "mb-8 max-w-2xl text-body-lg leading-body text-text-inverted/90 md:text-xl",
                delay: "200",
              })}
            >
              Online or in-person coaching with Eli — strength, nutrition, and a plan that takes
              your cycle into account.
            </p>
            <div
              className={getHeroEntranceClassName({
                delay: "400",
                style: "pop",
              })}
            >
              <Button className="uppercase tracking-wide" size="lg">
                See if we’re a fit
                <ChevronRight aria-hidden="true" size={20} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
