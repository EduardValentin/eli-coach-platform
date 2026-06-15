import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Dumbbell,
  Moon,
  PersonStanding,
  Sparkles,
} from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const days = [
  { id: 'mon', name: 'Mon', label: 'Strength', icon: Dumbbell, color: 'var(--training-strength)', bg: 'var(--training-strength-soft)' },
  { id: 'tue', name: 'Tue', label: 'Rest', icon: Moon, color: 'var(--training-rest)', bg: 'var(--training-rest-soft)' },
  { id: 'wed', name: 'Wed', label: 'Recovery', icon: PersonStanding, color: 'var(--training-recovery)', bg: 'var(--training-recovery-soft)' },
  { id: 'thu', name: 'Thu', label: 'Strength', icon: Dumbbell, color: 'var(--training-strength)', bg: 'var(--training-strength-soft)' },
  { id: 'fri', name: 'Fri', label: 'Rest', icon: Moon, color: 'var(--training-rest)', bg: 'var(--training-rest-soft)' },
  { id: 'sat', name: 'Sat', label: 'Hypertrophy', icon: Sparkles, color: 'var(--training-hypertrophy)', bg: 'var(--training-hypertrophy-soft)' },
  { id: 'sun', name: 'Sun', label: 'Recovery', icon: PersonStanding, color: 'var(--training-recovery)', bg: 'var(--training-recovery-soft)' },
];

export function WorkoutSchedule() {
  const headingId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const scroller = scrollRef.current;
    if (!wrapper || !scroller) return;

    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let isTracking = false;
    let isHorizontal: boolean | null = null;

    const onTouchStart = (event: TouchEvent) => {
      if (scroller.contains(event.target as Node)) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startScroll = scroller.scrollLeft;
      isTracking = true;
      isHorizontal = null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isTracking) return;
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (isHorizontal === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (isHorizontal) {
        scroller.scrollLeft = startScroll - dx;
        event.preventDefault();
      } else {
        isTracking = false;
      }
    };

    const onTouchEnd = () => {
      isTracking = false;
    };

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
    wrapper.addEventListener('touchend', onTouchEnd, { passive: true });
    wrapper.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart);
      wrapper.removeEventListener('touchmove', onTouchMove);
      wrapper.removeEventListener('touchend', onTouchEnd);
      wrapper.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      className="py-24 bg-background"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-24" ref={wrapperRef}>

        <div className="text-center mb-16">
          <SectionEyebrow>A week of training</SectionEyebrow>
          <h2
            id={headingId}
            className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-foreground mb-4 leading-tight"
          >
            Workouts that support your body
          </h2>
          <p className="text-copy-muted max-w-2xl mx-auto">
            A balanced week built around how you feel — not a fixed template.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-3 md:gap-4 overflow-x-auto w-full pb-4 hide-scrollbar snap-x snap-mandatory justify-start min-[656px]:justify-center md:justify-start xl:justify-center motion-reduce:transform-none"
          ref={scrollRef}
        >
          {days.map((day, index) => {
            const Icon = day.icon;
            return (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex flex-col shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-sm snap-center motion-reduce:transform-none"
                style={{ backgroundColor: day.bg }}
              >
                <div className="border-b border-white/40 p-1.5 md:p-2 text-center">
                  <span className="text-xs font-semibold text-copy-muted uppercase tracking-widest">{day.name}</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
                  <span
                    className="text-xs font-medium uppercase tracking-widest"
                    style={{ color: day.color }}
                  >
                    {day.label}
                  </span>
                  <Icon size={16} color={day.color} aria-hidden="true" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
