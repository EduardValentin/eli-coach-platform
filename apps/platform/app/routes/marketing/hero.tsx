import { joinBasePath } from "@eli-coach-platform/config";
import type {
  WaitlistJoinResponse,
  WaitlistSnapshot,
} from "@eli-coach-platform/contracts";
import { Button, cn, IconButton, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

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
  botDetection: BotDetectionConfig;
  waitlist: WaitlistSnapshot;
};

type HeroEntranceStyle = "slide" | "pop" | "fade";

const heroEntranceStyleClasses = {
  fade: "ui-public-hero-entrance-fade",
  pop: "ui-public-hero-entrance-pop",
  slide: "",
} satisfies Record<HeroEntranceStyle, string>;

function getHeroEntranceClassName(style: HeroEntranceStyle = "slide") {
  return cn("ui-public-hero-entrance", heroEntranceStyleClasses[style]);
}

function getHeroEntranceStyle(delayMs: number): CSSProperties {
  return {
    animationDelay: `${delayMs}ms`,
  };
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
  const [playRequested, setPlayRequested] = useState(true);
  const [waitlistResponse, setWaitlistResponse] = useState<WaitlistJoinResponse | null>(null);
  const isPlaying = !prefersReducedMotion && playRequested;
  const spotsRemaining = resolveHeroSpotsRemaining({
    response: waitlistResponse,
    spotsRemaining: props.waitlist.spotsRemaining,
  });
  const isFull = spotsRemaining === 0;

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

      if (!prefersReducedMotion) {
        void videoRef.current.play().catch(() => {
          setPlayRequested(false);
        });
      }
    }

    setPlayRequested(true);
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
        <IconButton
          aria-label={isPlaying ? "Pause hero video" : "Play hero video"}
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
          onClick={restartVideo}
          variant="inverted"
        >
          <RotateCcw aria-hidden="true" size={20} />
        </IconButton>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center py-32">
        {props.waitlist.enabled ? (
          <HeroPanel
            eyebrow={isFull ? "This round is full" : "Limited spots"}
            className="w-full"
            heading="Coaching built around your body."
            headingClassName="max-w-4xl"
            paragraph={
              isFull
                ? "Leave your email — I'll let you know when new spots open."
                : (
                  <>
                    Strength, nutrition, and cycle-aware coaching — only a few spots at{" "}
                    <Link
                      className="underline decoration-text-inverted/40 underline-offset-4 transition-colors duration-150 ease-out hover:decoration-text-inverted"
                      to="/pricing"
                    >
                      reduced pricing
                    </Link>
                    .
                  </>
                )
            }
            paragraphClassName="mb-10 font-regular"
            paragraphDelayMs={250}
          >
            <div
              className={cn(getHeroEntranceClassName(), "mb-6 w-full")}
              style={getHeroEntranceStyle(400)}
            >
              <WaitlistEmailForm
                botDetection={props.botDetection}
                onResponseChange={setWaitlistResponse}
                spotsRemaining={spotsRemaining}
                variant="dark"
              />
            </div>
            {isFull ? null : (
              <div
                className={cn(getHeroEntranceClassName(), "mb-6 w-full")}
                style={getHeroEntranceStyle(550)}
              >
                <SpotCounter
                  cap={props.waitlist.cap}
                  spotsRemaining={spotsRemaining}
                  variant="dark"
                />
              </div>
            )}
            <p
              className={cn(
                getHeroEntranceClassName("fade"),
                "text-xs tracking-wide text-text-inverted/60",
              )}
              style={getHeroEntranceStyle(isFull ? 550 : 700)}
            >
              No spam. Just one email when doors open.
            </p>
          </HeroPanel>
        ) : (
          <HeroPanel
            className="max-w-4xl"
            heading="Strength training for women."
            paragraph="Online or in-person coaching with Eli — strength, nutrition, and a plan that takes your cycle into account."
            paragraphClassName="mb-8"
            paragraphDelayMs={200}
          >
            <div
              className={getHeroEntranceClassName("pop")}
              style={getHeroEntranceStyle(400)}
            >
              <Button className="uppercase tracking-wide" size="lg">
                See if we’re a fit
                <ChevronRight aria-hidden="true" size={20} />
              </Button>
            </div>
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
}>;

function HeroPanel(props: HeroPanelProps) {
  return (
    <div className={cn("ui-public-hero-panel flex flex-col items-center", props.className)}>
      {props.eyebrow ? (
        <span
          className={cn(
            getHeroEntranceClassName("fade"),
            "mb-4 inline-block text-sm font-medium uppercase tracking-[0.2em] text-text-inverted/70",
          )}
          style={getHeroEntranceStyle(0)}
        >
          {props.eyebrow}
        </span>
      ) : null}
      <h1
        className={cn(
          getHeroEntranceClassName(),
          "mb-4 font-heading text-[2.75rem] font-medium leading-tight text-text-inverted sm:text-[3.5rem] lg:text-[4.75rem]",
          props.headingClassName,
        )}
        style={getHeroEntranceStyle(props.eyebrow ? 100 : 0)}
      >
        {props.heading}
      </h1>
      <p
        className={cn(
          getHeroEntranceClassName(),
          "max-w-2xl text-body-lg leading-body text-text-inverted/90 md:text-xl",
          props.paragraphClassName,
        )}
        style={getHeroEntranceStyle(props.paragraphDelayMs)}
      >
        {props.paragraph}
      </p>
      {props.children}
    </div>
  );
}

function resolveHeroSpotsRemaining(options: {
  response: WaitlistJoinResponse | null;
  spotsRemaining: number | null;
}): number | null {
  if (!options.response) {
    return options.spotsRemaining;
  }

  if (options.response.success) {
    return options.response.spotsRemaining;
  }

  return options.spotsRemaining;
}
