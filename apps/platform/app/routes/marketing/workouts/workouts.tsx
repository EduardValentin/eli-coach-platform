import { cn, SectionEyebrow } from "@eli-coach-platform/ui";
import { Dumbbell, Moon, PersonStanding, Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { createFadeUpVariants, marketingViewportOnce } from "../marketing-motion";
import "./workouts.css";

type TrainingDayType = "strength" | "hypertrophy" | "recovery" | "rest";

type TrainingDayTypeContent = {
  Icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
  label: string;
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
  },
  hypertrophy: {
    Icon: Sparkles,
    cardClassName: "bg-training-hypertrophy-soft",
    iconClassName: "text-training-hypertrophy",
    label: "Hypertrophy",
  },
  recovery: {
    Icon: PersonStanding,
    cardClassName: "bg-training-recovery-soft",
    iconClassName: "text-training-recovery",
    label: "Recovery",
  },
  rest: {
    Icon: Moon,
    cardClassName: "bg-training-rest-soft",
    iconClassName: "text-training-rest",
    label: "Rest",
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
  return (
    <motion.section
      aria-label="Workouts that support your body"
      className="bg-surface-base py-24"
      initial="hidden"
      viewport={marketingViewportOnce}
      whileInView="visible"
    >
      <div className="mx-auto w-full max-w-stage px-6 lg:px-24">
        <motion.div
          className="mb-16 text-center"
          variants={createFadeUpVariants({ duration: 0.6, offset: 24 })}
        >
          <SectionEyebrow>A week of training</SectionEyebrow>
          <h2 className="ui-public-workouts-heading font-heading text-3xl font-medium md:text-4xl lg:text-5xl">
            Workouts that support your body
          </h2>
          <p className="ui-public-workouts-lede mx-auto mt-4 max-w-2xl text-body-base">
            A balanced week built around how you feel — not a fixed template.
          </p>
        </motion.div>

        <ul
          aria-label="Weekly workout schedule"
          className="ui-public-workouts-schedule-row flex w-full snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-4 md:gap-4"
        >
          {WORKOUT_SCHEDULE.map((day, index) => {
            const dayType = TRAINING_DAY_TYPES[day.type];
            const Icon = dayType.Icon;

            return (
              <motion.li
                className={cn(
                  "flex h-20 w-20 shrink-0 snap-center flex-col md:h-28 md:w-28",
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
                  <span className="ui-public-workouts-day-label">{day.dayName}</span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-2">
                  <span className={cn("ui-public-workouts-type-label", dayType.iconClassName)}>
                    {dayType.label}
                  </span>
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
