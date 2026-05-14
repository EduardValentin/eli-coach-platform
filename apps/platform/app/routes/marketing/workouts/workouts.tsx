import { cn, SectionEyebrow, useHasEnteredViewport } from "@eli-coach-platform/ui";
import { Dumbbell, Moon, PersonStanding, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

type TrainingDayType = "strength" | "hypertrophy" | "recovery" | "rest";

type TrainingDayTypeContent = {
  Icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
  label: string;
};

type WorkoutScheduleDay = {
  dayName: string;
  delayClassName: string;
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
  { dayName: "Mon", delayClassName: "ui-public-workouts-card-delay-0", id: "mon", type: "strength" },
  { dayName: "Tue", delayClassName: "ui-public-workouts-card-delay-1", id: "tue", type: "rest" },
  { dayName: "Wed", delayClassName: "ui-public-workouts-card-delay-2", id: "wed", type: "recovery" },
  { dayName: "Thu", delayClassName: "ui-public-workouts-card-delay-3", id: "thu", type: "strength" },
  { dayName: "Fri", delayClassName: "ui-public-workouts-card-delay-4", id: "fri", type: "rest" },
  {
    dayName: "Sat",
    delayClassName: "ui-public-workouts-card-delay-5",
    id: "sat",
    type: "hypertrophy",
  },
  { dayName: "Sun", delayClassName: "ui-public-workouts-card-delay-6", id: "sun", type: "recovery" },
] as const satisfies readonly WorkoutScheduleDay[];

export function MarketingWorkouts() {
  const headingId = useId();
  const [isEntranceEnhanced, setIsEntranceEnhanced] = useState(false);
  const { hasEnteredViewport, ref } = useHasEnteredViewport<HTMLElement>();
  const entryState = isEntranceEnhanced
    ? hasEnteredViewport
      ? "entered"
      : "pending"
    : undefined;

  useEffect(() => {
    setIsEntranceEnhanced(true);
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      className="bg-surface-base py-24"
      id="workouts"
      ref={ref}
    >
      <div className="mx-auto w-full max-w-stage px-6 lg:px-24">
        <div
          className="ui-public-workouts-entry mb-16 text-center"
          data-entry-state={entryState}
        >
          <SectionEyebrow>A week of training</SectionEyebrow>
          <h2
            className="ui-public-workouts-heading font-heading text-3xl font-medium text-text-primary md:text-4xl lg:text-5xl"
            id={headingId}
          >
            Workouts that support your body
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body-base text-text-secondary">
            A balanced week built around how you feel — not a fixed template.
          </p>
        </div>

        <ul
          aria-label="Weekly workout schedule"
          className="flex w-full snap-x snap-mandatory items-center justify-center gap-2 overflow-x-auto pb-4 md:gap-4"
        >
          {WORKOUT_SCHEDULE.map((day) => {
            const dayType = TRAINING_DAY_TYPES[day.type];
            const Icon = dayType.Icon;

            return (
              <li
                className={cn(
                  "ui-public-workouts-card flex h-20 w-20 shrink-0 snap-center flex-col motion-reduce:transform-none md:h-28 md:w-28",
                  dayType.cardClassName,
                  day.delayClassName,
                )}
                data-entry-state={entryState}
                key={day.id}
              >
                <div className="border-b border-surface-base/40 p-1.5 text-center md:p-2">
                  <span className="text-[10px] font-semibold tracking-widest text-text-secondary uppercase">
                    {day.dayName}
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-2">
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-widest uppercase md:text-xs",
                      dayType.iconClassName,
                    )}
                  >
                    {dayType.label}
                  </span>
                  <Icon aria-hidden="true" className={cn("size-4", dayType.iconClassName)} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
