import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { EmptyState } from "@eli-coach-platform/ui/portal";
import { Badge } from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";
import { CHECK_IN_FOCUS_PARAM } from "~/features/check-ins/public/paths";

import {
  CHECK_IN_LISTING_PARAMS,
  CHECK_IN_TABS,
  dateSortRuleFor,
  openingTabOf,
  orderCheckIns,
  parseTab,
  tabHolding,
  type CheckInTab,
  type ListedCheckIn,
} from "./check-in-listing-rules";

export type CheckInMoment = {
  date: string;
  time: string;
};

export type CheckInEmptyCopy = {
  description: string;
  icon: LucideIcon;
  title: string;
};

type CheckInListingProps<CheckIn extends ListedCheckIn> = {
  checkIns: readonly CheckIn[];
  emptyCopy: Record<CheckInTab, CheckInEmptyCopy>;
  renderCheckIn: (checkIn: CheckIn, tab: CheckInTab) => ReactNode;
};

export function checkInMomentOf(
  startsAt: string,
  timeZone: string,
): CheckInMoment {
  const instant = new Date(startsAt);

  return {
    date: formatShortDay(instant, timeZone),
    time: formatClockTime(instant, timeZone),
  };
}

const TAB_LABELS: Record<CheckInTab, string> = {
  upcoming: "Upcoming",
  requests: "Requests",
  past: "Past",
};

export function CheckInListing<CheckIn extends ListedCheckIn>({
  checkIns,
  emptyCopy,
  renderCheckIn,
}: CheckInListingProps<CheckIn>) {
  const [searchParams] = useSearchParams();
  const { key: locationKey } = useLocation();
  const focusedId = searchParams.get(CHECK_IN_FOCUS_PARAM);
  const [openedOn] = useState(() => openingTabOf(checkIns));
  const { chooseTab, tab } = useCheckInTabParam({
    defaultTab: tabHolding(focusedId, checkIns) ?? openedOn,
    openedOn,
  });
  useBringCheckInIntoFocus(focusedId, locationKey);
  const shown = orderCheckIns(
    checkIns.filter((checkIn) => checkIn.tab === tab),
    { direction: dateSortRuleFor(tab).defaultDirection.date, tab },
  );
  const awaitingViewerCount = checkIns.filter(
    (checkIn) => checkIn.awaitsViewer,
  ).length;
  const empty = emptyCopy[tab];

  return (
    <Tabs
      className="w-full"
      onValueChange={chooseTab}
      value={tab}
      variant="segmented"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
          <TabsList>
            {CHECK_IN_TABS.map((value) => (
              <TabsTrigger className="px-4 sm:px-5" key={value} value={value}>
                {TAB_LABELS[value]}
                {value === "requests" && awaitingViewerCount > 0 && (
                  <>
                    <Badge
                      aria-hidden="true"
                      data-parity="requests-count"
                      tone="count"
                    >
                      {awaitingViewerCount}
                    </Badge>
                    <span className="sr-only" data-parity="requests-count-sr">
                      {awaitingViewerCount} waiting on you
                    </span>
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <TabsContent data-parity="checkins-tab-panel" value={tab}>
        {shown.length === 0 ? (
          <EmptyState
            description={empty.description}
            descriptionParity="checkins-empty-description"
            icon={empty.icon}
            title={empty.title}
          />
        ) : (
          <ul aria-label={`${TAB_LABELS[tab]} check-ins`} className="space-y-3">
            {shown.map((checkIn) => (
              <li data-parity="checkin-row" key={checkIn.id}>
                <div
                  className="rounded-card"
                  id={anchorIdOf(checkIn.id)}
                  tabIndex={-1}
                >
                  {renderCheckIn(checkIn, tab)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function useCheckInTabParam(tabs: {
  defaultTab: CheckInTab;
  openedOn: CheckInTab;
}) {
  const { defaultTab, openedOn } = tabs;
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();

  const chooseTab = (value: string) => {
    const chosen = parseTab(value, openedOn);

    replaceSearchParams((params) => {
      params.delete(CHECK_IN_FOCUS_PARAM);

      if (chosen === openedOn) {
        params.delete(CHECK_IN_LISTING_PARAMS.tab);
        return;
      }

      params.set(CHECK_IN_LISTING_PARAMS.tab, chosen);
    });
  };

  return {
    chooseTab,
    tab: parseTab(searchParams.get(CHECK_IN_LISTING_PARAMS.tab), defaultTab),
  };
}

function useBringCheckInIntoFocus(
  focusedId: string | null,
  locationKey: string,
) {
  useEffect(() => {
    if (focusedId === null) {
      return;
    }

    const anchor = document.getElementById(anchorIdOf(focusedId));
    anchor?.scrollIntoView({ block: "center" });
    anchor?.focus({ preventScroll: true });
  }, [focusedId, locationKey]);
}

function anchorIdOf(checkInId: string): string {
  return `checkin-${checkInId}`;
}
