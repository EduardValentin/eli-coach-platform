import { cva } from "class-variance-authority";
import { Dumbbell, Footprints, Moon, type LucideIcon } from "lucide-react";

import { cn } from "~/shared/design-system/lib";

import { WEEKDAY_LABELS } from "~/bounded-contexts/programs/training-programs/public/program-editing";

import {
  dayLengthOf,
  dayPlanName,
  weekdayAbbreviation,
  type DayPlan,
  type WeekDay,
} from "./week-view";

type DayKind = DayPlan["kind"];

export const dayCellVariants = cva(
  "group/day relative grid w-full min-w-0 border",
  {
    variants: {
      kind: {
        session: "border-control-border-soft bg-surface-base",
        cardio:
          "border-training-recovery bg-training-recovery-soft text-training-recovery-ink",
        rest: "border-control-border-soft bg-surface-neutral",
      },
      variant: {
        rail: cn(
          "min-h-16 content-center justify-items-center gap-0.5 px-0.5 py-1.5 text-center",
          "@3xl:min-h-30 @3xl:grid-rows-[auto_1fr_auto] @3xl:content-stretch @3xl:justify-items-start @3xl:gap-1.5 @3xl:rounded-control @3xl:px-2 @3xl:py-3 @3xl:text-left @4xl:px-3",
        ),
        compact:
          "h-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] justify-items-start gap-x-1.5 gap-y-5 rounded-control px-2.5 py-2 text-left",
      },
    },
    compoundVariants: [
      { variant: "rail", kind: "session", class: "hover:bg-surface-subtle" },
      {
        variant: "rail",
        kind: "cardio",
        class: "hover:border-training-recovery-ink",
      },
      {
        variant: "rail",
        kind: "rest",
        class: "enabled:hover:bg-surface-muted-hover",
      },
    ],
  },
);

export const KIND_ICON: Record<DayKind, LucideIcon> = {
  session: Dumbbell,
  cardio: Footprints,
  rest: Moon,
};

const KIND_GLYPH_STROKE: Record<DayKind, number> = {
  session: 2.5,
  cardio: 2,
  rest: 1.5,
};

const KIND_GLYPH_CLASS: Record<DayKind, string> = {
  session: "text-text-primary",
  cardio: "text-training-recovery",
  rest: "text-text-secondary",
};

const WEEKDAY_CLASS = "text-xs font-medium";

const SELECTED_INK = "group-data-[state=active]/day:text-text-primary";

const KIND_META_CLASS: Record<DayKind, string> = {
  session: "text-text-secondary",
  cardio: cn("text-training-recovery-ink", SELECTED_INK),
  rest: "text-neutral-ink",
};

const KIND_NAME_CLASS: Record<DayKind, string> = {
  session: "text-text-primary",
  cardio: cn("text-training-recovery-ink", SELECTED_INK),
  rest: "text-neutral-ink",
};

function DayGlyph({ day }: { day: WeekDay }) {
  const { kind } = day.plan;
  const Glyph = KIND_ICON[kind];

  return (
    <Glyph
      aria-hidden="true"
      className={cn("size-4 shrink-0", KIND_GLYPH_CLASS[kind])}
      data-parity={`day-glyph-${day.weekday}`}
      strokeWidth={KIND_GLYPH_STROKE[kind]}
    />
  );
}

export function DayFace({ day }: { day: WeekDay }) {
  const { kind } = day.plan;
  const length = dayLengthOf(day.plan);

  return (
    <div
      className="col-span-full row-start-2 grid h-full content-between justify-items-start gap-1.5 text-left"
      data-parity={`day-face-${day.weekday}`}
    >
      <span
        className={cn(
          "line-clamp-2 text-sm font-medium text-balance break-words",
          KIND_NAME_CLASS[kind],
        )}
        data-parity={`day-name-${day.weekday}`}
      >
        {dayPlanName(day.plan)}
      </span>
      <span className="flex items-center gap-1.5">
        <DayGlyph day={day} />
        {length && (
          <>
            <span
              aria-hidden="true"
              className={cn("text-sm tabular-nums", KIND_META_CLASS[kind])}
              data-parity={`day-length-${day.weekday}`}
            >
              {length.shown}
            </span>
            <span className="sr-only">{length.spoken}</span>
          </>
        )}
      </span>
    </div>
  );
}

function spokenRailDay(day: WeekDay): string {
  return [WEEKDAY_LABELS[day.weekday], dayPlanName(day.plan)].join(", ");
}

export function DayCell({ day }: { day: WeekDay }) {
  const { kind } = day.plan;

  return (
    <>
      <span aria-hidden="true" className="contents">
        <span
          aria-hidden="true"
          className="flex flex-col items-center gap-0.5 @3xl:flex-row @3xl:gap-1.5"
        >
          <span
            className={cn(
              WEEKDAY_CLASS,
              "@3xl:text-label @3xl:uppercase",
              KIND_META_CLASS[kind],
            )}
          >
            {weekdayAbbreviation(day.weekday)}
          </span>
        </span>
        <span className="hidden content-start gap-1 self-start @3xl:grid">
          <span
            className={cn(
              "line-clamp-2 text-sm font-medium text-balance break-words",
              KIND_NAME_CLASS[kind],
            )}
          >
            {dayPlanName(day.plan)}
          </span>
        </span>
        <span className="flex items-center gap-1.5 self-end">
          <DayGlyph day={day} />
        </span>
      </span>
      <span className="sr-only">{spokenRailDay(day)}</span>
    </>
  );
}
