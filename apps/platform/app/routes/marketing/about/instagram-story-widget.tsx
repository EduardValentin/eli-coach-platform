import { cn, IconButton, PhoneFrame, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal, Send } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useState } from "react";

import { ABOUT_MEDIA, ABOUT_STORIES, INSTAGRAM_PROFILE_URL } from "./about-content";

const STORY_DURATION_MS = 5000;
const STORY_PROGRESS_INTERVAL_MS = 50;
const STORY_PROGRESS_INCREMENT = 100 / (STORY_DURATION_MS / STORY_PROGRESS_INTERVAL_MS);

function getNextStoryIndex(currentIndex: number) {
  return (currentIndex + 1) % ABOUT_STORIES.length;
}

function getPreviousStoryIndex(currentIndex: number) {
  if (currentIndex === 0) {
    return 0;
  }

  return currentIndex - 1;
}

export function InstagramStoryWidget() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedStories, setLikedStories] = useState(() => ABOUT_STORIES.map(() => false));
  const [progress, setProgress] = useState(0);
  const currentStory = ABOUT_STORIES[currentIndex];
  const isCurrentStoryLiked = likedStories[currentIndex] ?? false;

  const advanceStory = () => {
    setCurrentIndex((value) => getNextStoryIndex(value));
    setProgress(0);
  };

  const rewindStory = () => {
    setCurrentIndex((value) => getPreviousStoryIndex(value));
    setProgress(0);
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgress((value) => {
        if (value + STORY_PROGRESS_INCREMENT >= 100) {
          setCurrentIndex((index) => getNextStoryIndex(index));
          return 0;
        }

        return value + STORY_PROGRESS_INCREMENT;
      });
    }, STORY_PROGRESS_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [prefersReducedMotion, currentIndex]);

  const navigateFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;

    if (pointerX < rect.width / 2) {
      rewindStory();
      return;
    }

    advanceStory();
  };

  const navigateFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rewindStory();
    }

    if (event.key === "ArrowRight" || event.key === "Enter") {
      event.preventDefault();
      advanceStory();
    }
  };

  const toggleLike = () => {
    setLikedStories((stories) =>
      stories.map((isLiked, index) => (index === currentIndex ? !isLiked : isLiked)),
    );
  };

  return (
    <PhoneFrame
      aria-label="Instagram story preview"
      className="mx-auto aspect-[9/16] w-full max-w-[280px] shrink-0 lg:mx-0 lg:max-w-[340px]"
      statusBarVariant="light"
    >
      <div
        aria-label="Instagram stories — tap left or right to navigate"
        className="absolute inset-0 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-text-inverted"
        onClick={navigateFromPointer}
        onKeyDown={navigateFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <img
          alt={currentStory.alt}
          className="absolute inset-0 size-full object-cover transition-opacity duration-200"
          src={currentStory.imageSrc}
          style={{ objectPosition: currentStory.objectPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-surface-inverted/40 via-transparent to-surface-inverted/40"
        />
      </div>

      <div aria-hidden="true" className="absolute left-0 right-0 top-12 z-40 flex gap-1 px-4">
        {ABOUT_STORIES.map((story, index) => {
          const width = index < currentIndex ? 100 : index === currentIndex ? progress : 0;

          return (
            <div
              key={story.alt}
              className="h-[3px] flex-1 overflow-hidden rounded-pill bg-surface-base/30"
            >
              <div
                className="h-full bg-surface-base transition-[width] duration-75 ease-linear motion-reduce:transition-none"
                style={{ width: `${width}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[70px] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-pill border border-surface-base">
            <img alt="" className="size-full object-cover" src={ABOUT_MEDIA.heroPoster} />
          </div>
          <a
            className="pointer-events-auto inline-flex min-h-6 items-center text-body-sm font-medium text-text-inverted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
            href={INSTAGRAM_PROFILE_URL}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            eli.fitness
          </a>
          <span className="ml-1 text-xs text-text-inverted/60">4h</span>
        </div>
        <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted" />
      </div>

      <div className="absolute bottom-4 left-0 right-0 z-40 flex items-center gap-3 px-4">
        <div className="pointer-events-none flex-1 rounded-pill border border-surface-base/40 px-3.5 py-1.5 text-xs text-text-inverted/80 backdrop-blur-sm">
          Send message…
        </div>
        <IconButton
          aria-label={isCurrentStoryLiked ? "Unlike story" : "Like story"}
          className="size-11 text-text-inverted hover:text-text-inverted"
          onClick={toggleLike}
          size="sm"
          variant="inverted"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5 transition-colors", {
              "fill-brand-primary text-brand-primary": isCurrentStoryLiked,
            })}
          />
        </IconButton>
        <IconButton
          aria-label="Share story"
          className="size-11 text-text-inverted hover:text-text-inverted"
          size="sm"
          variant="inverted"
        >
          <Send aria-hidden="true" className="size-5" />
        </IconButton>
      </div>
    </PhoneFrame>
  );
}
