import { cn, PhoneFrame } from "@eli-coach-platform/ui";
import { Heart, Send } from "lucide-react";
import { motion } from "motion/react";
import {
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PropsWithChildren,
  useEffect,
  useState,
} from "react";

import { ABOUT_MEDIA, ABOUT_STORIES, INSTAGRAM_PROFILE_URL } from "./about-content";
import { useClientReducedMotionPreference } from "../marketing-motion";

const STORY_DURATION_MS = 5000;
const STORY_DURATION_SECONDS = STORY_DURATION_MS / 1000;

function getNextStoryIndex(currentIndex: number) {
  return (currentIndex + 1) % ABOUT_STORIES.length;
}

function getPreviousStoryIndex(currentIndex: number) {
  if (currentIndex === 0) {
    return 0;
  }

  return currentIndex - 1;
}

type StoryActionButtonProps = PropsWithChildren<
  Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
    accessibleName: string;
  }
>;

function StoryActionButton(props: StoryActionButtonProps) {
  return (
    <button
      aria-label={props.accessibleName}
      className="relative flex size-5 shrink-0 items-center justify-center text-text-inverted outline-none transition-colors duration-150 hover:text-text-inverted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-inverted after:absolute after:-inset-3 after:content-['']"
      onClick={props.onClick}
      type="button"
    >
      {props.children}
    </button>
  );
}

export function InstagramStoryWidget() {
  const shouldReduceMotion = useClientReducedMotionPreference();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedStories, setLikedStories] = useState(() => ABOUT_STORIES.map(() => false));
  const currentStory = ABOUT_STORIES[currentIndex];
  const isCurrentStoryLiked = likedStories[currentIndex] ?? false;

  const advanceStory = () => {
    setCurrentIndex((value) => getNextStoryIndex(value));
  };

  const rewindStory = () => {
    setCurrentIndex((value) => getPreviousStoryIndex(value));
  };

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentIndex((value) => getNextStoryIndex(value));
    }, STORY_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentIndex, shouldReduceMotion]);

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

    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
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
        className="absolute inset-0 cursor-pointer outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-text-inverted"
        onClick={navigateFromPointer}
        onKeyDown={navigateFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <motion.video
          animate={{ opacity: 1 }}
          aria-label={currentStory.alt}
          autoPlay={!shouldReduceMotion}
          className="absolute inset-0 size-full object-cover"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          key={currentStory.alt}
          loop={!shouldReduceMotion}
          muted
          playsInline
          poster={currentStory.posterSrc}
          preload={shouldReduceMotion ? "none" : "metadata"}
          style={{ objectPosition: currentStory.objectPosition }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {shouldReduceMotion
            ? null
            : currentStory.videoSources.map((source) => (
                <source key={source.type} src={source.src} type={source.type} />
              ))}
        </motion.video>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-surface-inverted/40 via-transparent to-surface-inverted/40"
        />
      </div>

      <div aria-hidden="true" className="absolute left-0 right-0 top-12 z-40 flex gap-1 px-4">
        {ABOUT_STORIES.map((story, index) => {
          const isCurrentStory = index === currentIndex;
          const scaleX = index < currentIndex || (isCurrentStory && shouldReduceMotion) ? 1 : 0;

          return (
            <div
              key={story.alt}
              className="h-[3px] flex-1 overflow-hidden rounded-pill bg-surface-base/30"
            >
              <motion.div
                animate={{ scaleX: isCurrentStory ? 1 : scaleX }}
                className="h-full origin-left bg-surface-base"
                initial={isCurrentStory && !shouldReduceMotion ? { scaleX: 0 } : { scaleX }}
                key={`${story.alt}-${currentIndex}`}
                transition={{
                  duration: isCurrentStory && !shouldReduceMotion ? STORY_DURATION_SECONDS : 0,
                  ease: "linear",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[70px] z-40 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-pill border border-surface-base">
            <img alt="" className="size-full object-cover" src={ABOUT_MEDIA.heroPoster} />
          </div>
          <a
            className="pointer-events-auto inline-flex min-h-6 items-center text-body-sm font-medium text-text-inverted outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
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
        <input
          aria-label="Send message"
          className="pointer-events-none min-w-0 flex-1 rounded-pill border border-surface-base/40 bg-transparent px-3.5 py-1.5 text-xs text-text-inverted/80 outline-none placeholder:text-text-inverted/80 placeholder:opacity-100 backdrop-blur-sm"
          placeholder="Send message…"
          readOnly
          tabIndex={-1}
          type="text"
        />
        <StoryActionButton
          accessibleName={isCurrentStoryLiked ? "Unlike story" : "Like story"}
          onClick={toggleLike}
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5 transition-colors", {
              "fill-brand-primary text-brand-primary": isCurrentStoryLiked,
            })}
          />
        </StoryActionButton>
        <StoryActionButton accessibleName="Share story">
          <Send aria-hidden="true" className="size-5" />
        </StoryActionButton>
      </div>
    </PhoneFrame>
  );
}
