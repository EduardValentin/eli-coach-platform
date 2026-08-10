import { cn, createFadeUpVariants, marketingViewportOnce, SectionEyebrow } from "@eli-coach-platform/ui";
import { Dumbbell, Moon, PersonStanding, Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

type TrainingDayType = "strength" | "hypertrophy" | "recovery" | "rest";

type TrainingDayTypeContent = {
  Icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
  label: string;
  labelClassName: string;
};

type WorkoutScheduleDay = {
  dayName: string;
  id: string;
  type: TrainingDayType;
};

const TRAINING_DAY_TYPES = {
  strength: {
    Icon: Dumbbell,
    cardClassName: "bg-training-strength-soft",
    iconClassName: "text-training-strength",
    label: "Strength",
    labelClassName: "text-label text-training-strength uppercase",
  },
  hypertrophy: {
    Icon: Sparkles,
    cardClassName: "bg-training-hypertrophy-soft",
    iconClassName: "text-training-hypertrophy",
    label: "Hypertrophy",
    labelClassName: "text-label text-training-hypertrophy uppercase",
  },
  recovery: {
    Icon: PersonStanding,
    cardClassName: "bg-training-recovery-soft",
    iconClassName: "text-training-recovery",
    label: "Recovery",
    labelClassName: "text-label text-training-recovery uppercase",
  },
  rest: {
    Icon: Moon,
    cardClassName: "bg-training-rest-soft",
    iconClassName: "text-training-rest",
    label: "Rest",
    labelClassName: "text-label text-training-rest uppercase",
  },
} satisfies Record<TrainingDayType, TrainingDayTypeContent>;

const WORKOUT_SCHEDULE = [
  { dayName: "Mon", id: "mon", type: "strength" },
  { dayName: "Tue", id: "tue", type: "rest" },
  { dayName: "Wed", id: "wed", type: "recovery" },
  { dayName: "Thu", id: "thu", type: "strength" },
  { dayName: "Fri", id: "fri", type: "rest" },
  {
    dayName: "Sat",
    id: "sat",
    type: "hypertrophy",
  },
  { dayName: "Sun", id: "sun", type: "recovery" },
] as const satisfies readonly WorkoutScheduleDay[];

export function MarketingWorkouts() {
  const scrollRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapper.addEventListener("touchend", onTouchEnd, { passive: true });
    wrapper.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      wrapper.removeEventListener("touchend", onTouchEnd);
      wrapper.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <motion.section
      aria-label="Workouts that support your body"
      className="bg-surface-base py-24"
      initial="hidden"
      viewport={marketingViewportOnce}
      whileInView="visible"
    >
      <div className="mx-auto w-full max-w-stage px-6 lg:px-24" ref={wrapperRef}>
        <motion.div
          className="mb-16 text-center"
          variants={createFadeUpVariants({ duration: 0.6, offset: 24 })}
        >
          <SectionEyebrow>A week of training</SectionEyebrow>
          <h2 className="font-heading text-3xl leading-tight font-medium text-text-primary md:text-4xl lg:text-5xl">
            Workouts that support your body
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body-base text-copy-muted">
            A balanced week built around how you feel — not a fixed template.
          </p>
        </motion.div>

        <ul
          aria-label="Weekly workout schedule"
          className="flex w-full snap-x snap-mandatory items-center justify-start gap-3 overflow-x-auto pb-4 min-[41rem]:justify-center md:justify-start md:gap-4 min-[80rem]:justify-center"
          ref={scrollRef}
        >
          {WORKOUT_SCHEDULE.map((day, index) => {
            const dayType = TRAINING_DAY_TYPES[day.type];
            const Icon = dayType.Icon;

            return (
              <motion.li
                className={cn(
                  "flex h-24 w-24 shrink-0 snap-center flex-col md:h-28 md:w-28",
                  dayType.cardClassName,
                )}
                key={day.id}
                variants={createFadeUpVariants({
                  delay: index * 0.06,
                  duration: 0.4,
                  offset: 24,
                })}
              >
                <div className="border-b border-surface-base/40 p-1.5 text-center md:p-2">
                  <span className="text-label text-copy-muted uppercase">{day.dayName}</span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-2">
                  <span className={dayType.labelClassName}>{dayType.label}</span>
                  <Icon aria-hidden="true" className={cn("size-4", dayType.iconClassName)} />
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}
