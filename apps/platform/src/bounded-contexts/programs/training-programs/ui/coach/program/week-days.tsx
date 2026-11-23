import { useId, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  cn,
  EYEBROW_CLASS,
  WIDGET_TITLE_CLASS,
} from "~/shared/design-system/lib";
import {
  cardVariants,
  RowActionsMenu,
} from "~/shared/design-system/primitives";
import { Tabs, TabsContent } from "~/shared/design-system/tabs";

import {
  BlockLoss,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type Block,
  type DayChoice,
  type Weekday,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { blockEditing } from "./builder-editing";
import { DayFace, dayCellVariants, KIND_ICON } from "./day-cell";
import { useDestructiveConfirm } from "./destructive-confirm";
import { useContainerWidthRem } from "./use-container-width-rem";
import {
  dayLengthOf,
  dayPlanName,
  planOn,
  weekdayAbbreviation,
  type WeekDay,
} from "./week-view";
import { WeekRailTabs } from "./week-rail";

type WeekDaysProps = { block: Block; onChange: (block: Block) => void };

type DayMenuProps = {
  block: Block;
  day: Weekday;
  onChoose: (choice: DayChoice, trigger: HTMLElement | null) => void;
};

type ChooseDay = (
  day: Weekday,
  choice: DayChoice,
  trigger: HTMLElement | null,
) => void;

type WeekLayout = "row" | "rail";

/** Seven columns of at least 5.5rem with the 0.5rem gaps between them. */
const ROW_MIN_REM = 7 * 5.5 + 6 * 0.5;

function DayMenu({ block, day, onChoose }: DayMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const choose = (choice: DayChoice) => onChoose(choice, trigger.current);

  return (
    <RowActionsMenu
      actions={[
        {
          name: "session",
          label: "Session",
          icon: KIND_ICON.session,
          actions: block.sessions.map((session) => ({
            name: session.id,
            label: session.name,
            onSelect: () => choose({ kind: "session", sessionId: session.id }),
          })),
        },
        {
          name: "cardio",
          label: "Cardio",
          icon: KIND_ICON.cardio,
          onSelect: () => choose({ kind: "cardio" }),
        },
        {
          name: "rest",
          label: "Rest",
          icon: KIND_ICON.rest,
          onSelect: () => choose({ kind: "rest" }),
        },
      ]}
      label={`${WEEKDAY_LABELS[day]} options`}
      size="xs"
      triggerRef={trigger}
    />
  );
}

function dayTitle(block: Block, day: Weekday, choice: DayChoice): string {
  const weekday = WEEKDAY_LABELS[day];
  if (choice.kind === "rest") return `Make ${weekday} a rest day?`;
  if (choice.kind === "cardio") return `Make ${weekday} a cardio day?`;
  const name =
    block.sessions.find((session) => session.id === choice.sessionId)?.name ??
    "the session";

  return `Put ${name} on ${weekday}?`;
}

function lostByChoice(block: Block, day: Weekday, choice: DayChoice): string[] {
  const keepsContent =
    choice.kind !== "rest" && choice.kind === block.calendar[day].kind;

  return keepsContent
    ? []
    : BlockLoss.describe(block, { kind: "day", weekday: day });
}

function weekOf(block: Block): WeekDay[] {
  return WEEKDAYS.map((weekday) => ({ weekday, plan: planOn(block, weekday) }));
}

function useWeekLayout(): {
  ref: RefObject<HTMLElement | null>;
  layout: WeekLayout;
} {
  const { ref, widthRem } = useContainerWidthRem<HTMLElement>();

  return {
    ref,
    layout: widthRem > 0 && widthRem < ROW_MIN_REM ? "rail" : "row",
  };
}

type DayCardProps = { day: WeekDay; menu: ReactNode };

/** The weekday and the options share the card's top line; the face below is plain text. */
function DayCard({ day, menu }: DayCardProps) {
  return (
    <div
      className={dayCellVariants({ variant: "compact", kind: day.plan.kind })}
      data-parity={`day-${day.weekday}`}
    >
      <h4 className={cn(EYEBROW_CLASS, "col-start-1 row-start-1")}>
        <span aria-hidden="true">{weekdayAbbreviation(day.weekday)}</span>
        <span className="sr-only">{WEEKDAY_LABELS[day.weekday]}</span>
      </h4>
      <DayFace day={day} />
      <div className="relative z-10 col-start-2 row-start-1 -mt-1 -mr-1.5 flex items-center">
        {menu}
      </div>
    </div>
  );
}

type BuilderWeekProps = { block: Block; days: WeekDay[]; onChoose: ChooseDay };

function BuilderWeekRow({ block, days, onChoose }: BuilderWeekProps) {
  return (
    <ol className="grid grid-cols-7 gap-x-2" data-parity="week-row">
      {days.map((day) => (
        <li className="grid" key={day.weekday}>
          <DayCard
            day={day}
            menu={
              <DayMenu
                block={block}
                day={day.weekday}
                onChoose={(choice, trigger) =>
                  onChoose(day.weekday, choice, trigger)
                }
              />
            }
          />
        </li>
      ))}
    </ol>
  );
}

function initialRailDay(days: readonly WeekDay[]): Weekday {
  return (days.find((day) => day.plan.kind !== "rest") ?? days[0]).weekday;
}

function BuilderWeekTabs({ block, days, onChoose }: BuilderWeekProps) {
  const [selected, setSelected] = useState<Weekday>(() => initialRailDay(days));
  const day =
    days.find((candidate) => candidate.weekday === selected) ?? days[0];
  const length = dayLengthOf(day.plan);

  return (
    <Tabs
      className="gap-3"
      onValueChange={(value) => setSelected(value as Weekday)}
      value={selected}
      variant="rail"
    >
      <WeekRailTabs days={days} label="Days" />
      <TabsContent
        className={cn(cardVariants({ variant: "quiet" }), "grid gap-5 p-3")}
        value={selected}
      >
        <div className="flex items-center justify-between gap-3">
          <h4 className={WIDGET_TITLE_CLASS}>{WEEKDAY_LABELS[day.weekday]}</h4>
          <DayMenu
            block={block}
            day={day.weekday}
            onChoose={(choice, trigger) =>
              onChoose(day.weekday, choice, trigger)
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-sm text-text-primary" data-parity="day-panel-plan">
            {dayPlanName(day.plan)}
            {length && (
              <span
                className="text-text-secondary tabular-nums"
                data-parity="day-panel-length"
              >{` · ${length}`}</span>
            )}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

type WeekSectionProps = {
  children: ReactNode;
  headingId: string;
  layoutRef: RefObject<HTMLElement | null>;
};

function WeekSection({ children, headingId, layoutRef }: WeekSectionProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="@container grid grid-cols-[minmax(0,1fr)] gap-2 lg:**:scroll-mt-[calc(var(--block-header-height)+0.5rem)]"
      ref={layoutRef}
    >
      <h3 className={WIDGET_TITLE_CLASS} id={headingId}>
        Week
      </h3>
      {children}
    </section>
  );
}

export function WeekDays({ block, onChange }: WeekDaysProps) {
  const headingId = useId();
  const confirm = useDestructiveConfirm();
  const { ref, layout } = useWeekLayout();
  const days = weekOf(block);

  function choose(
    day: Weekday,
    choice: DayChoice,
    trigger: HTMLElement | null,
  ) {
    confirm.request({
      title: dayTitle(block, day, choice),
      confirmLabel: "Change day",
      lines: lostByChoice(block, day, choice),
      apply: () => onChange(blockEditing.blockWithDay(block, day, choice)),
      returnFocus: trigger,
    });
  }

  const view = { block, days, onChoose: choose };

  return (
    <WeekSection headingId={headingId} layoutRef={ref}>
      {layout === "row" ? (
        <BuilderWeekRow {...view} />
      ) : (
        <BuilderWeekTabs {...view} />
      )}
      {confirm.dialog}
    </WeekSection>
  );
}
