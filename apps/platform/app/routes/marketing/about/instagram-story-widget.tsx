import { cn, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal } from "lucide-react";

import {
  ABOUT_INSTAGRAM_HANDLE,
  ABOUT_INSTAGRAM_URL,
  ABOUT_STORIES,
} from "./about-content";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function isReducedMotionRequested() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function InstagramStoryWidget() {
  const activeStory = ABOUT_STORIES[0];
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoadStoryVideo = !prefersReducedMotion && !isReducedMotionRequested();

  return (
    <section
      aria-label="Instagram stories from Eli"
      className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-panel border border-border-subtle bg-surface-inverted text-text-inverted shadow-soft"
    >
      <video
        aria-label={activeStory.label}
        autoPlay={shouldLoadStoryVideo}
        className="absolute inset-0 size-full object-cover opacity-80"
        loop={shouldLoadStoryVideo}
        muted
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
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-overlay-strong via-surface-inverted/10 to-overlay-strong"
      />
      <div aria-hidden="true" className="absolute left-5 right-5 top-5 z-20 flex gap-1">
        {ABOUT_STORIES.map((story, index) => (
          <span
            key={story.id}
            className="h-1 flex-1 overflow-hidden rounded-pill bg-text-inverted/30"
            data-testid="story-progress-segment"
          >
            <span
              className={cn("block h-full rounded-pill bg-text-inverted", {
                "w-0": index !== 0,
                "w-full": index === 0,
              })}
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
        <span
          aria-hidden="true"
          className="inline-flex size-[var(--size-control-md)] items-center justify-center rounded-pill text-text-inverted"
        >
          <Heart aria-hidden="true" className="size-5" />
        </span>
      </div>
    </section>
  );
}
