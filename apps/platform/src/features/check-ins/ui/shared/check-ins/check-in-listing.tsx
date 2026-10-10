import { EmptyState } from "@eli-coach-platform/ui/portal";
import { Badge } from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { ClientCheckIns } from "~/features/check-ins/public/check-ins";

export type ListedCheckIn = ClientCheckIns["checkIns"][number];

export type CheckInParty = ListedCheckIn["initiatedBy"];

export type CheckInTab = "upcoming" | "requests" | "past";

export type CheckInEmptyCopy = {
  description: string;
  icon: LucideIcon;
  title: string;
};

type CheckInListingProps<CheckIn extends ListedCheckIn> = {
  checkIns: readonly CheckIn[];
  defaultTab: CheckInTab;
  emptyCopy: Record<CheckInTab, CheckInEmptyCopy>;
  renderCheckIn: (checkIn: CheckIn, tab: CheckInTab) => ReactNode;
};

const CHECK_IN_TABS: readonly CheckInTab[] = ["upcoming", "requests", "past"];

const TAB_LABELS: Record<CheckInTab, string> = {
  upcoming: "Upcoming",
  requests: "Requests",
  past: "Past",
};

const TAB_OF_STATUS: Record<ListedCheckIn["status"], CheckInTab> = {
  approved: "upcoming",
  pending: "requests",
  passed: "past",
  cancelled: "past",
};

export function CheckInListing<CheckIn extends ListedCheckIn>({
  checkIns,
  defaultTab,
  emptyCopy,
  renderCheckIn,
}: CheckInListingProps<CheckIn>) {
  const [tab, setTab] = useState(defaultTab);
  const shown = ordered(
    checkIns.filter((checkIn) => TAB_OF_STATUS[checkIn.status] === tab),
    tab,
  );
  const awaitingViewerCount = checkIns.filter(
    (checkIn) => checkIn.awaitsViewer,
  ).length;
  const empty = emptyCopy[tab];

  return (
    <Tabs
      className="w-full"
      onValueChange={(chosen) => setTab(tabNamed(chosen, defaultTab))}
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
                    <span className="sr-only">
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
                {renderCheckIn(checkIn, tab)}
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function tabNamed(name: string, fallback: CheckInTab): CheckInTab {
  return CHECK_IN_TABS.find((tab) => tab === name) ?? fallback;
}

function ordered<CheckIn extends ListedCheckIn>(
  checkIns: readonly CheckIn[],
  tab: CheckInTab,
): CheckIn[] {
  const direction = tab === "past" ? -1 : 1;
  const answerRank = (checkIn: CheckIn) =>
    tab === "requests" && checkIn.awaitsViewer ? 0 : 1;
  const byStart = (first: CheckIn, second: CheckIn) =>
    direction * (Date.parse(first.startsAt) - Date.parse(second.startsAt));

  return [...checkIns].sort(
    (first, second) =>
      answerRank(first) - answerRank(second) || byStart(first, second),
  );
}
