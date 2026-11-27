import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react';
import { Heart, Pause, Play, Send } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { ELI_PORTRAIT_SMALL } from '../utils/eliPortrait';

const STORY_MEDIA_ROOT = `${import.meta.env.BASE_URL}media/about/`;

const stories = ['lifestyle', 'mobility', 'gym'].map((reelName) => ({
  posterSrc: `${STORY_MEDIA_ROOT}story-${reelName}-poster.webp`,
  videoSrc: `${STORY_MEDIA_ROOT}story-${reelName}.h264.mp4`,
}));

const STORY_DURATION_MS = 10_000;
const STORY_PROGRESS_COMPLETE = 100;
const STORY_PROGRESS_TICK_MS = STORY_DURATION_MS / STORY_PROGRESS_COMPLETE;
const STORY_LOAD_VIEWPORT_MARGIN = '200px';

function isAutoplayRefusal(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}

interface StoryVideoProps {
  label: string;
  poster?: string;
  playback: 'running' | 'held';
  onAutoplayRefused: () => void;
  children: ReactNode;
}

function StoryVideo({ label, poster, playback, onAutoplayRefused, children }: StoryVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (playback === 'held') {
      video.pause();
      return;
    }

    void video.play().catch((error: unknown) => {
      if (isAutoplayRefusal(error)) {
        onAutoplayRefused();
      }
    });
  }, [playback, onAutoplayRefused]);

  return (
    <motion.video
      ref={videoRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-label={label}
      poster={poster}
      muted
      playsInline
      preload="none"
      data-parity="story-media"
      className="absolute inset-0 w-full h-full object-cover"
    >
      {children}
    </motion.video>
  );
}

export function InstagramWidget() {
  const storySurfaceRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useInView(storySurfaceRef, { once: true, margin: STORY_LOAD_VIEWPORT_MARGIN });
  const isInViewport = useInView(storySurfaceRef);
  const shouldReduceMotion = useReducedMotion() === true;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playRequested, setPlayRequested] = useState(true);
  const isStoryRunning = playRequested && isInViewport && !shouldReduceMotion;
  const currentStory = stories[currentIndex];
  const currentProgress = shouldReduceMotion ? STORY_PROGRESS_COMPLETE : progress;

  useEffect(() => {
    if (!isStoryRunning) {
      return;
    }

    const timer = setInterval(() => setProgress((value) => value + 1), STORY_PROGRESS_TICK_MS);

    return () => clearInterval(timer);
  }, [currentIndex, isStoryRunning]);

  useEffect(() => {
    if (progress < STORY_PROGRESS_COMPLETE) {
      return;
    }

    handleNext();
  }, [progress]);

  const holdPlayback = useCallback(() => setPlayRequested(false), []);

  const handleNext = () => {
    setCurrentIndex((index) => (index + 1) % stories.length);
    setProgress(0);
    setIsLiked(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setIsLiked(false);
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  return (
    <PhoneFrame
      aria-label="Instagram story preview"
      statusBarVariant="light"
      className="w-full max-w-[280px] lg:max-w-[340px] aspect-[9/16] shrink-0 mx-auto lg:mx-0"
    >
      <div
        ref={storySurfaceRef}
        className="absolute inset-0 cursor-pointer"
        onClick={handleTap}
        aria-label="Instagram stories — tap left or right to navigate"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') handlePrev();
          if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        }}
      >
        <AnimatePresence mode="wait">
          <StoryVideo
            key={currentIndex}
            label={`Story ${currentIndex + 1} of ${stories.length}`}
            poster={isNearViewport ? currentStory.posterSrc : undefined}
            playback={isStoryRunning ? 'running' : 'held'}
            onAutoplayRefused={holdPlayback}
          >
            {isNearViewport && !shouldReduceMotion ? (
              <source src={currentStory.videoSrc} type="video/mp4" />
            ) : null}
          </StoryVideo>
        </AnimatePresence>
        <div
          aria-hidden="true"
          data-parity="story-overlay"
          className="absolute inset-0 bg-gradient-to-b from-surface-inverted/90 via-transparent to-surface-inverted/60 pointer-events-none"
        />
      </div>

      <div aria-hidden="true" data-parity="story-progress" className="absolute top-12 left-0 right-0 px-4 flex gap-1 z-40 pointer-events-none">
        {stories.map((_, idx) => (
          <div key={idx} data-parity={`story-progress-track-${idx + 1}`} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              data-parity={`story-progress-fill-${idx + 1}`}
              className="h-full bg-white transition-all duration-75 ease-linear"
              style={{
                width: `${idx < currentIndex ? 100 : idx === currentIndex ? currentProgress : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-[70px] left-0 right-0 px-4 flex items-center z-40 pointer-events-none">
        <div className="flex items-center gap-2">
          <div data-parity="story-avatar" className="w-8 h-8 rounded-full border border-white overflow-hidden">
            <img
              src={ELI_PORTRAIT_SMALL}
              alt=""
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <a
            href="https://www.instagram.com/elilungu_"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="pointer-events-auto text-white text-sm font-medium"
          >
            eli.fitness
          </a>
          <span className="text-surface-inverted-foreground text-xs ml-1">4h</span>
        </div>
        {shouldReduceMotion ? null : (
          <button
            type="button"
            onClick={() => setPlayRequested(!playRequested)}
            aria-label={playRequested ? 'Pause story' : 'Play story'}
            data-focus-inset
            data-focus-on-media
            data-parity="story-playback"
            className="pointer-events-auto ml-auto -my-2 -mr-3.5 inline-flex size-(--size-control-md) items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-white/20"
          >
            {playRequested ? <Pause aria-hidden="true" size={20} /> : <Play aria-hidden="true" size={20} />}
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center gap-3 z-40">
        <div className="flex-1 border border-white/80 rounded-full px-3.5 py-1.5 text-white/80 text-xs backdrop-blur-sm pointer-events-none">
          Send message…
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked((v) => !v);
          }}
          className="outline-none"
          aria-label={isLiked ? 'Unlike story' : 'Like story'}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked ? 'fill-brand text-brand' : 'text-white'
            }`}
            aria-hidden="true"
          />
        </button>
        <button className="outline-none" aria-label="Share story">
          <Send className="w-5 h-5 text-white" aria-hidden="true" />
        </button>
      </div>
    </PhoneFrame>
  );
}
