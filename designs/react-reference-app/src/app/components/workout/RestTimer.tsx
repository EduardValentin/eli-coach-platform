import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from 'motion/react';
import { Minus, Plus, SkipForward, RotateCcw, Timer } from 'lucide-react';
import { Button } from '../ui/button';

interface RestTimerProps {
  initialSeconds: number;
  onComplete: (actualSeconds: number) => void;
  onSkip: (actualSeconds: number) => void;
}

export function RestTimer({
  initialSeconds,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [total, setTotal] = useState(initialSeconds);
  const [minimized, setMinimized] = useState(true);
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Drag-to-minimize
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 150], [1, 0.6]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      onComplete(elapsed);
    }
  }, [remaining, onComplete]);

  const handleSkip = useCallback(() => {
    clearInterval(intervalRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    onSkip(elapsed);
  }, [onSkip]);

  const handleAdjust = useCallback((delta: number) => {
    setRemaining((prev) => Math.max(0, prev + delta));
    setTotal((prev) => Math.max(1, prev + delta));
  }, []);

  const handleRestart = useCallback(() => {
    setRemaining(initialSeconds);
    setTotal(initialSeconds);
    startTimeRef.current = Date.now();
  }, [initialSeconds]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 300) {
      setMinimized(true);
    }
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = total > 0 ? (total - remaining) / total : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  // ── Minimized pill ──────────────────────────────────────────
  if (minimized) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 lg:gap-3 bg-text-primary/95 backdrop-blur-sm text-surface-inverted-foreground pl-4 pr-5 py-3 lg:pl-5 lg:pr-6 lg:py-4 rounded-full shadow-raised border border-white/10"
      >
        <div className="relative w-8 h-8 lg:w-10 lg:h-10 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <Timer
            size={14}
            className="absolute inset-0 m-auto text-surface-inverted-foreground/70 lg:size-[18px]"
          />
        </div>
        <span className="text-base lg:text-xl font-semibold tabular-nums">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </motion.button>
    );
  }

  // ── Expanded sheet ──────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
        style={{ y: dragY, opacity: sheetOpacity }}
        className="fixed inset-x-0 bottom-0 z-50 bg-text-primary/95 backdrop-blur-sm rounded-t-panel px-6 pt-3 pb-10 flex flex-col items-center gap-4 touch-none"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/25 shrink-0 cursor-grab active:cursor-grabbing" />

        {/* REST label */}
        <p className="text-label uppercase text-surface-inverted-foreground/50">
          Rest
        </p>

        {/* Circular countdown */}
        <div className="relative w-32 h-32 lg:w-40 lg:h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-value-lg text-surface-inverted-foreground tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Time adjust buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => handleAdjust(-30)}
            className="bg-white/10 text-surface-inverted-foreground/70 hover:bg-white/15 hover:text-surface-inverted-foreground"
          >
            <Minus />
            30
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => handleAdjust(-15)}
            className="bg-white/10 text-surface-inverted-foreground/70 hover:bg-white/15 hover:text-surface-inverted-foreground"
          >
            <Minus />
            15
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => handleAdjust(15)}
            className="bg-white/10 text-surface-inverted-foreground hover:bg-white/20"
          >
            <Plus />
            15
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => handleAdjust(30)}
            className="bg-white/10 text-surface-inverted-foreground hover:bg-white/20"
          >
            <Plus />
            30
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestart}
            className="flex-1 border-transparent bg-white/10 text-surface-inverted-foreground hover:bg-white/20"
          >
            <RotateCcw />
            Restart
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSkip}
            className="flex-1"
          >
            <SkipForward />
            Skip
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
