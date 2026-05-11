import { cn, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

import {
  ABOUT_INSTAGRAM_HANDLE,
  ABOUT_INSTAGRAM_URL,
  ABOUT_STORIES,
} from "./about-content";

const PROGRESS_TICK_MS = 100;

export function InstagramStoryWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(() => new Set());
  const [failedStoryIds, setFailedStoryIds] = useState<Set<string>>(() => new Set());
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeStory = ABOUT_STORIES[currentIndex];
  const activeStoryNumber = currentIndex + 1;
  const shouldLoadStoryVideo = motionPreferenceReady && !prefersReducedMotion;
  const activeStoryLiked = likedStoryIds.has(activeStory.id);
  const activeStoryFailed = failedStoryIds.has(activeStory.id);

  const goToNextStory = useCallback(() => {
    setCurrentIndex((currentIndex + 1) % ABOUT_STORIES.length);
  }, [currentIndex]);

  const goToPreviousStory = useCallback(() => {
    setCurrentIndex(currentIndex === 0 ? ABOUT_STORIES.length - 1 : currentIndex - 1);
  }, [currentIndex]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    setMotionPreferenceReady(true);
  }, []);

  useEffect(() => {
    setProgressPercent(prefersReducedMotion ? 100 : 0);

    const timeoutId = window.setTimeout(goToNextStory, activeStory.durationMs);
    let intervalId: number | undefined;
    let elapsedStoryMs = 0;

    if (!prefersReducedMotion) {
      intervalId = window.setInterval(() => {
        elapsedStoryMs += PROGRESS_TICK_MS;
        setProgressPercent(Math.min(100, (elapsedStoryMs / activeStory.durationMs) * 100));
      }, PROGRESS_TICK_MS);
    }

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeStory.durationMs, currentIndex, goToNextStory, prefersReducedMotion]);

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
    const nextLikedStoryIds = new Set(likedStoryIds);

    if (activeStoryLiked) {
      nextLikedStoryIds.delete(activeStory.id);
    } else {
      nextLikedStoryIds.add(activeStory.id);
    }

    setLikedStoryIds(nextLikedStoryIds);
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

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The story region is intentionally focusable for arrow-key carousel navigation. */
    <section
      aria-label="Instagram stories from Eli"
      className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-panel border border-border-subtle bg-surface-inverted text-text-inverted shadow-soft outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
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
          key={activeStory.id}
          aria-label={activeStory.label}
          autoPlay={shouldLoadStoryVideo}
          className="absolute inset-0 size-full object-cover opacity-80"
          loop={shouldLoadStoryVideo}
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
        className="absolute bottom-20 left-0 top-20 z-10 w-1/2 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
        onClick={goToPreviousStory}
        type="button"
      />
      <button
        aria-label="Next story"
        className="absolute bottom-20 right-0 top-20 z-10 w-1/2 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
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
          className="inline-flex min-h-[var(--size-control-md)] items-center rounded-pill text-body-sm font-medium text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
          href={ABOUT_INSTAGRAM_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {ABOUT_INSTAGRAM_HANDLE} on Instagram
        </a>
        <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted/80" />
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
          className="inline-flex size-[var(--size-control-md)] items-center justify-center rounded-pill text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
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
