import { cn, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal, Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import {
  ABOUT_INSTAGRAM_HANDLE,
  ABOUT_INSTAGRAM_URL,
  ABOUT_STORIES,
} from "./about-content";

const PROGRESS_TICK_MS = 100;
const STORY_PANEL_FOCUS_CLASS =
  "focus-visible:[outline:3px_solid_var(--color-brand-primary)] focus-visible:[outline-offset:4px]";
const STORY_HIT_ZONE_FOCUS_CLASS =
  "focus-visible:bg-brand-primary/20 focus-visible:[outline:3px_solid_var(--color-text-inverted)] focus-visible:[outline-offset:-6px] focus-visible:[box-shadow:inset_0_0_0_6px_var(--color-brand-primary)]";
const STORY_CONTROL_FOCUS_CLASS =
  "focus-visible:bg-surface-inverted/80 focus-visible:[outline:3px_solid_var(--color-brand-primary)] focus-visible:[outline-offset:2px]";

export function InstagramStoryWidget() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(() => new Set());
  const [failedStoryIds, setFailedStoryIds] = useState<Set<string>>(() => new Set());
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [storyAutoAdvancePaused, setStoryAutoAdvancePaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeStory = ABOUT_STORIES[currentIndex];
  const activeStoryNumber = currentIndex + 1;
  const shouldLoadStoryVideo = motionPreferenceReady && !prefersReducedMotion;
  const storyVideoPlaying = shouldLoadStoryVideo && !storyAutoAdvancePaused;
  const activeStoryLiked = likedStoryIds.has(activeStory.id);
  const activeStoryFailed = failedStoryIds.has(activeStory.id);

  const goToNextStory = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % ABOUT_STORIES.length);
  }, []);

  const goToPreviousStory = useCallback(() => {
    setCurrentIndex((index) => (index === 0 ? ABOUT_STORIES.length - 1 : index - 1));
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    setMotionPreferenceReady(true);
  }, []);

  useEffect(() => {
    setProgressPercent(prefersReducedMotion ? 100 : 0);
  }, [currentIndex, prefersReducedMotion]);

  useEffect(() => {
    if (storyAutoAdvancePaused) {
      return;
    }

    const timeoutId = window.setTimeout(goToNextStory, activeStory.durationMs);
    let intervalId: number | undefined;

    if (!prefersReducedMotion) {
      intervalId = window.setInterval(() => {
        setProgressPercent((currentProgress) =>
          Math.min(
            100,
            currentProgress + (PROGRESS_TICK_MS / activeStory.durationMs) * 100,
          ),
        );
      }, PROGRESS_TICK_MS);
    }

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    activeStory.durationMs,
    currentIndex,
    goToNextStory,
    prefersReducedMotion,
    storyAutoAdvancePaused,
  ]);

  const progressValues = useMemo(
    () =>
      ABOUT_STORIES.map((story, index) => {
        if (index < currentIndex) {
          return { id: story.id, value: 100 };
        }

        if (index === currentIndex) {
          return { id: story.id, value: progressPercent };
        }

        return { id: story.id, value: 0 };
      }),
    [currentIndex, progressPercent],
  );

  const toggleActiveStoryLike = () => {
    setLikedStoryIds((currentLikedStoryIds) => {
      const nextLikedStoryIds = new Set(currentLikedStoryIds);

      if (nextLikedStoryIds.has(activeStory.id)) {
        nextLikedStoryIds.delete(activeStory.id);
      } else {
        nextLikedStoryIds.add(activeStory.id);
      }

      return nextLikedStoryIds;
    });
  };

  const toggleStoryAutoAdvance = () => {
    setStoryAutoAdvancePaused((isPaused) => {
      const nextPaused = !isPaused;

      if (nextPaused) {
        videoRef.current?.pause();
      }

      return nextPaused;
    });
  };

  const markActiveStoryFailed = () => {
    setFailedStoryIds((currentFailedStoryIds) => {
      const nextFailedStoryIds = new Set(currentFailedStoryIds);
      nextFailedStoryIds.add(activeStory.id);
      return nextFailedStoryIds;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousStory();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNextStory();
    }
  };

  const handleWidgetFocus = (event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.currentTarget.scrollIntoView?.({ block: "center", inline: "nearest" });
  };

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The story region is intentionally focusable for arrow-key carousel navigation. */
    <section
      aria-label="Instagram stories from Eli"
      className={cn(
        "relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-panel border border-border-subtle bg-surface-inverted text-text-inverted shadow-soft outline-none",
        STORY_PANEL_FOCUS_CLASS,
      )}
      onFocus={handleWidgetFocus}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {activeStoryFailed ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-surface-inverted px-6 text-center text-body-sm text-text-inverted/80"
          role="status"
        >
          Story media unavailable
        </div>
      ) : (
        <video
          ref={videoRef}
          key={activeStory.id}
          aria-label={activeStory.label}
          autoPlay={storyVideoPlaying}
          className="absolute inset-0 size-full object-cover opacity-80"
          loop={storyVideoPlaying}
          muted
          onError={markActiveStoryFailed}
          playsInline
          poster={activeStory.poster}
          preload="metadata"
        >
          {shouldLoadStoryVideo
            ? activeStory.sources.map((source) => (
                <source key={source.type} src={source.src} type={source.type} />
              ))
            : null}
        </video>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-overlay-strong via-surface-inverted/10 to-overlay-strong"
      />
      <button
        aria-label="Previous story"
        className={cn(
          "absolute bottom-20 left-0 top-20 z-10 w-1/2 cursor-pointer outline-none",
          STORY_HIT_ZONE_FOCUS_CLASS,
        )}
        onClick={goToPreviousStory}
        type="button"
      />
      <button
        aria-label="Next story"
        className={cn(
          "absolute bottom-20 right-0 top-20 z-10 w-1/2 cursor-pointer outline-none",
          STORY_HIT_ZONE_FOCUS_CLASS,
        )}
        onClick={goToNextStory}
        type="button"
      />
      <div aria-hidden="true" className="absolute left-5 right-5 top-5 z-20 flex gap-1">
        {progressValues.map((progressValue, index) => (
          <span
            key={progressValue.id}
            className="h-1 flex-1 overflow-hidden rounded-pill bg-text-inverted/30"
            data-testid="story-progress-segment"
          >
            <span
              className="block h-full rounded-pill bg-text-inverted transition-[width] duration-100 ease-linear motion-reduce:transition-none"
              data-testid={index === currentIndex ? "story-progress-active" : undefined}
              style={{ width: `${progressValue.value}%` }}
            />
          </span>
        ))}
      </div>
      <div className="absolute left-5 right-5 top-10 z-30 flex items-center justify-between gap-3">
        <a
          className={cn(
            "inline-flex min-h-[var(--size-control-md)] items-center rounded-pill text-body-sm font-medium text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary",
            STORY_CONTROL_FOCUS_CLASS,
          )}
          href={ABOUT_INSTAGRAM_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {ABOUT_INSTAGRAM_HANDLE} on Instagram
        </a>
        <div className="flex items-center gap-2">
          <button
            aria-label={
              storyAutoAdvancePaused
                ? "Resume story auto-advance"
                : "Pause story auto-advance"
            }
            className={cn(
              "inline-flex size-[var(--size-control-md)] items-center justify-center rounded-pill text-text-inverted/80 outline-none transition-colors duration-150 ease-out hover:text-brand-primary",
              STORY_CONTROL_FOCUS_CLASS,
            )}
            onClick={toggleStoryAutoAdvance}
            type="button"
          >
            {storyAutoAdvancePaused ? (
              <Play aria-hidden="true" className="size-4" />
            ) : (
              <Pause aria-hidden="true" className="size-4" />
            )}
          </button>
          <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted/80" />
        </div>
      </div>
      <div className="absolute bottom-5 left-5 right-5 z-30 flex items-center gap-3">
        <div className="flex min-h-[var(--size-control-md)] flex-1 items-center rounded-pill border border-text-inverted/35 px-5 text-body-sm text-text-inverted/80 backdrop-blur-sm">
          Send message...
        </div>
        <button
          aria-label={
            activeStoryLiked
              ? `Unlike story ${activeStoryNumber}`
              : `Like story ${activeStoryNumber}`
          }
          className={cn(
            "inline-flex size-[var(--size-control-md)] items-center justify-center rounded-pill text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary",
            STORY_CONTROL_FOCUS_CLASS,
          )}
          onClick={toggleActiveStoryLike}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5", {
              "fill-brand-primary text-brand-primary": activeStoryLiked,
            })}
          />
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        Story {activeStoryNumber} of {ABOUT_STORIES.length}
      </p>
    </section>
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  );
}
