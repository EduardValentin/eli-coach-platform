import { TabsList, TabsTrigger } from "~/shared/design-system/tabs";
import { cn } from "~/shared/design-system/lib";

import { DayCell, dayCellVariants } from "./day-cell";
import type { WeekDay } from "./week-view";

type WeekRailTabsProps = { label: string; days: readonly WeekDay[] };

const TOUCHING_CELL_CLASS =
  "not-first:-ml-px not-first:w-[calc(100%+1px)] @3xl:not-first:ml-0 @3xl:not-first:w-full";

export function WeekRailTabs({ label, days }: WeekRailTabsProps) {
  return (
    <TabsList aria-label={label} className="grid-cols-7 @3xl:gap-2">
      {days.map((day) => (
        <TabsTrigger
          className={cn(
            dayCellVariants({ variant: "rail", kind: day.plan.kind }),
            TOUCHING_CELL_CLASS,
          )}
          data-parity="rail-day"
          key={day.weekday}
          value={day.weekday}
        >
          <DayCell day={day} />
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
