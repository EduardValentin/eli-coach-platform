import { PhoneFrame } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import { Heart, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useState,
} from "react";

import {
  ABOUT_MEDIA,
  ABOUT_STORIES,
  INSTAGRAM_PROFILE_URL,
} from "./about-content";

const STORY_PROGRESS_TICK_MS = 50;
const STORY_PROGRESS_COMPLETE = 100;

function getNextStoryIndex(currentIndex: number) {
  return (currentIndex + 1) % ABOUT_STORIES.length;
}

function getStoryProgress(options: {
  currentIndex: number;
  currentProgress: number;
  storyIndex: number;
}) {
  if (options.storyIndex < options.currentIndex) {
    return STORY_PROGRESS_COMPLETE;
  }

  if (options.storyIndex > options.currentIndex) {
    return 0;
  }

  return Math.min(options.currentProgress, STORY_PROGRESS_COMPLETE);
}

export function InstagramStoryWidget() {
  const shouldReduceMotion = useClientReducedMotionPreference();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [likedStories, setLikedStories] = useState(() =>
    ABOUT_STORIES.map(() => false),
  );
  const currentStory = ABOUT_STORIES[currentIndex];
  const isCurrentStoryLiked = likedStories[currentIndex] ?? false;
  const currentProgress = shouldReduceMotion
    ? STORY_PROGRESS_COMPLETE
    : progress;

  const showStory = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  const advanceStory = () => {
    showStory(getNextStoryIndex(currentIndex));
  };

  const rewindStory = () => {
    if (currentIndex === 0) {
      return;
    }

    showStory(currentIndex - 1);
  };

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgress((value) => value + 1);
    }, STORY_PROGRESS_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentIndex, shouldReduceMotion]);

  useEffect(() => {
    if (progress <= STORY_PROGRESS_COMPLETE) {
      return;
    }

    setCurrentIndex((value) => getNextStoryIndex(value));
    setProgress(0);
  }, [progress]);

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

    if (
      event.key === "ArrowRight" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      advanceStory();
    }
  };

  const toggleLike = () => {
    setLikedStories((stories) =>
      stories.map((isLiked, index) =>
        index === currentIndex ? !isLiked : isLiked,
      ),
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
        className="absolute inset-0 cursor-pointer"
        onClick={navigateFromPointer}
        onKeyDown={navigateFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <AnimatePresence mode="wait">
          <motion.video
            animate={{ opacity: 1 }}
            aria-label={currentStory.alt}
            autoPlay={!shouldReduceMotion}
            className="absolute inset-0 size-full object-cover"
            exit={{ opacity: 0 }}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            key={currentStory.alt}
            loop={!shouldReduceMotion}
            muted
            playsInline
            poster={currentStory.posterSrc}
            preload={shouldReduceMotion ? "none" : "metadata"}
            style={{ objectPosition: currentStory.objectPosition }}
            transition={{ duration: 0.2 }}
          >
            {shouldReduceMotion
              ? null
              : currentStory.videoSources.map((source) => (
                  <source
                    key={source.type}
                    src={source.src}
                    type={source.type}
                  />
                ))}
          </motion.video>
        </AnimatePresence>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-inverted/40 via-transparent to-surface-inverted/40"
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-12 z-40 flex gap-1 px-4"
      >
        {ABOUT_STORIES.map((story, storyIndex) => (
          <div
            key={story.alt}
            className="h-[3px] flex-1 overflow-hidden rounded-pill bg-surface-base/30"
          >
            <div
              className="h-full bg-surface-base transition-all duration-75 ease-linear"
              style={{
                width: `${getStoryProgress({ currentIndex, currentProgress, storyIndex })}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[70px] z-40 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-pill border border-surface-base">
            <img
              alt=""
              className="size-full object-cover"
              src={ABOUT_MEDIA.heroPoster}
            />
          </div>
          <a
            className="pointer-events-auto text-sm font-medium text-text-inverted"
            href={INSTAGRAM_PROFILE_URL}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            eli.fitness
          </a>
          <span className="ml-1 text-xs text-text-inverted/60">4h</span>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 z-40 flex items-center gap-3 px-4">
        <div className="pointer-events-none flex-1 rounded-pill border border-surface-base/40 px-3.5 py-1.5 text-xs text-text-inverted/80 backdrop-blur-sm">
          Send message…
        </div>
        <button
          aria-label={isCurrentStoryLiked ? "Unlike story" : "Like story"}
          className="outline-none"
          onClick={toggleLike}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5 transition-colors", {
              "fill-brand-primary text-brand-primary": isCurrentStoryLiked,
              "text-text-inverted": !isCurrentStoryLiked,
            })}
          />
        </button>
        <button aria-label="Share story" className="outline-none" type="button">
          <Send aria-hidden="true" className="size-5 text-text-inverted" />
        </button>
      </div>
    </PhoneFrame>
  );
}
