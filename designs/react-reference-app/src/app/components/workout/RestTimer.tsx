import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Minus, Plus, SkipForward, RotateCcw, Timer } from 'lucide-react';

interface RestTimerProps {
  initialSeconds: number;
  onComplete: (actualSeconds: number) => void;
  onSkip: (actualSeconds: number) => void;
}

export function RestTimer({ initialSeconds, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [total, setTotal] = useState(initialSeconds);
  const [minimized, setMinimized] = useState(false);
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Drag-to-minimize
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 150], [1, 0.6]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
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
    setRemaining(prev => Math.max(0, prev + delta));
    setTotal(prev => Math.max(1, prev + delta));
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
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#121212]/95 backdrop-blur-sm text-white pl-4 pr-5 py-3 rounded-full shadow-xl border border-white/10"
      >
        <div className="relative w-8 h-8 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <Timer size={14} className="absolute inset-0 m-auto text-white/70" />
        </div>
        <span className="text-base font-bold font-serif tabular-nums">
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
        className="fixed inset-x-0 bottom-0 z-50 bg-[#121212]/95 backdrop-blur-sm rounded-t-3xl px-6 pt-3 pb-10 flex flex-col items-center gap-4 touch-none"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/25 shrink-0 cursor-grab active:cursor-grabbing" />

        {/* REST label */}
        <p className="text-xs font-bold uppercase tracking-widest text-white/50">Rest</p>

        {/* Circular countdown */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <motion.circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-serif font-bold text-white tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Time adjust buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAdjust(-30)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-colors"
          >
            <Minus size={12} />30
          </button>
          <button
            onClick={() => handleAdjust(-15)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-colors"
          >
            <Minus size={12} />15
          </button>
          <button
            onClick={() => handleAdjust(15)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <Plus size={12} />15
          </button>
          <button
            onClick={() => handleAdjust(30)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <Plus size={12} />30
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <RotateCcw size={15} />
            Restart
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#C81D6B] text-white text-sm font-semibold hover:bg-[#B0185E] transition-colors"
          >
            <SkipForward size={15} />
            Skip
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
