import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { Weekday } from "@eli-coach-platform/domain/coach-availability";
import { DASHBOARD_ROW_CLASS } from "@eli-coach-platform/ui/appointments";
import { cn, useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import {
  PortalWidget,
  Reading,
  WidgetAction,
  WidgetLink,
} from "@eli-coach-platform/ui/portal";
import {
  Badge,
  DateTimeLabel,
  DisabledActionHint,
  RowActionsMenu,
} from "@eli-coach-platform/ui/primitives";
import {
  CalendarClock,
  CalendarRange,
  CalendarX,
  ChevronRight,
} from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { Link } from "react-router";

import type {
  CheckInScheduling,
  CoachCheckIn,
  CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";
import {
  COACH_CHECK_INS_PATH,
  coachCheckInPath,
} from "~/features/check-ins/public/paths";
import { formatClockHour } from "~/features/assessment-calls/public/call-moment";
import { possessivePronoun } from "~/features/assessment-calls/public/visitor-profile";
import { awaitingOnboardingReason } from "~/features/check-ins/ui/coach/shared/awaiting-onboarding-reason";
import { checkInMomentOf } from "~/features/check-ins/ui/shared/check-ins/check-in-listing";
import { WEEKDAY_LABELS } from "~/features/coach-schedule/public/coach-schedule-settings";

import { StopWeeklyCheckInDialog } from "./stop-weekly-check-in-dialog";
import {
  WeeklyCheckInDialog,
  type WeeklyCheckInSeries,
  type WeeklyCheckInTarget,
} from "./weekly-check-in-dialog";

type WeeklyCheckInPanelProps = {
  client: {
    clientId: string;
    firstName: string;
    gender: VisitorGender;
  };
  scheduling: CheckInScheduling;
  suggestedWeekday: Weekday | null;
  weekly: CoachClientSeriesPanel;
};

type Opening<Subject> = {
  open: boolean;
  openings: number;
  subject: Subject;
};

type SeriesSummaryProps = {
  coachingEnds: boolean;
  gender: VisitorGender;
  nextWeek: CoachCheckIn | null;
  scheduling: CheckInScheduling;
  series: WeeklyCheckInSeries | null;
};

type SeriesFooterProps = {
  actionRef: RefObject<HTMLButtonElement | null>;
  gender: VisitorGender;
  onSetUp: () => void;
  scheduling: CheckInScheduling;
  series: WeeklyCheckInSeries | null;
};

export function WeeklyCheckInPanel({
  client,
  scheduling,
  suggestedWeekday,
  weekly,
}: WeeklyCheckInPanelProps) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const [seriesDialog, setSeriesDialog] =
    useState<Opening<WeeklyCheckInTarget> | null>(null);
  const [stopConfirmation, setStopConfirmation] =
    useState<Opening<string> | null>(null);
  const coachingEnds = weekly.coachingEnds || scheduling === "ended";
  const series = coachingEnds ? null : weekly.series;

  return (
    <PortalWidget
      action={
        series && (
          <RowActionsMenu
            actions={[
              {
                icon: CalendarClock,
                label: "Change",
                name: "change",
                onSelect: () =>
                  setSeriesDialog(
                    openingOf<WeeklyCheckInTarget>({ mode: "change", series }),
                  ),
              },
              {
                icon: CalendarX,
                label: "Stop",
                name: "stop",
                onSelect: () => setStopConfirmation(openingOf(series.id)),
                tone: "destructive",
              },
            ]}
            label="More actions for the weekly check-in"
            size="xs"
            triggerRef={actionRef}
          />
        )
      }
      className="h-full"
      data-parity-root="WeeklyCheckinPanel"
      footer={
        !coachingEnds && (
          <SeriesFooter
            actionRef={actionRef}
            gender={client.gender}
            onSetUp={() =>
              setSeriesDialog(
                openingOf<WeeklyCheckInTarget>({ mode: "set-up" }),
              )
            }
            scheduling={scheduling}
            series={series}
          />
        )
      }
      headingId="weekly-check-in-panel-heading"
      icon={
        <CalendarRange
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      title="Weekly check-in"
    >
      <div data-parity="series-summary">
        <SeriesSummary
          coachingEnds={coachingEnds}
          gender={client.gender}
          nextWeek={weekly.nextWeek}
          scheduling={scheduling}
          series={series}
        />
      </div>

      {seriesDialog && (
        <WeeklyCheckInDialog
          client={client}
          key={`weekly-${seriesDialog.openings}`}
          onOpenChange={(open) =>
            setSeriesDialog((current) => current && { ...current, open })
          }
          open={seriesDialog.open}
          returnFocusTo={actionRef}
          suggestedWeekday={suggestedWeekday}
          target={seriesDialog.subject}
        />
      )}

      {stopConfirmation && (
        <StopWeeklyCheckInDialog
          clientFirstName={client.firstName}
          key={`stop-${stopConfirmation.openings}`}
          onOpenChange={(open) =>
            setStopConfirmation((current) => current && { ...current, open })
          }
          open={stopConfirmation.open}
          returnFocusTo={actionRef}
          seriesId={stopConfirmation.subject}
        />
      )}
    </PortalWidget>
  );
}

function SeriesSummary({
  coachingEnds,
  gender,
  nextWeek,
  scheduling,
  series,
}: SeriesSummaryProps) {
  if (coachingEnds) {
    return (
      <p
        className="text-sm text-text-secondary"
        data-parity="series-coaching-ends"
      >
        {coachingEndsLineOf(gender, scheduling)}
      </p>
    );
  }

  if (!series) {
    return (
      <p className="text-sm text-text-secondary" data-parity="series-empty">
        No weekly check-in yet.
      </p>
    );
  }

  return (
    <>
      <Reading
        label="Schedule"
        value={ruleLineOf(series)}
        valueParity="series-rule"
      />
      {nextWeek ? (
        <NextWeekLink week={nextWeek} />
      ) : (
        <p
          className="mt-5 text-sm text-text-secondary"
          data-parity="series-weeks-empty"
        >
          No week to come.
        </p>
      )}
    </>
  );
}

function NextWeekLink({ week }: { week: CoachCheckIn }) {
  const timeZone = useCalendarDayTimeZone();

  return (
    <Link
      className={cn(DASHBOARD_ROW_CLASS, "group mt-5")}
      data-parity="series-next-week"
      to={coachCheckInPath(week.id)}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="sr-only">Next weekly check-in: </span>
        <DateTimeLabel
          size="sm"
          when={checkInMomentOf(week.startsAt, timeZone)}
        />
        {week.status === "clash" && (
          <Badge data-parity="clash-badge" tone="pending">
            Clash
          </Badge>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="shrink-0 text-text-secondary transition-colors group-hover:text-text-primary"
        data-parity="series-next-week-chevron"
        size={16}
      />
    </Link>
  );
}

function SeriesFooter({
  actionRef,
  gender,
  onSetUp,
  scheduling,
  series,
}: SeriesFooterProps) {
  if (series) {
    return (
      <WidgetLink
        data-parity="series-view-all"
        to={COACH_CHECK_INS_PATH}
        trailing="arrow"
      >
        View all check-ins
      </WidgetLink>
    );
  }

  const setUp = (
    <WidgetAction
      data-parity="series-set-up"
      onClick={onSetUp}
      ref={actionRef}
      trailing="arrow"
    >
      Set up a weekly check-in
    </WidgetAction>
  );

  if (scheduling === "awaiting_onboarding") {
    return (
      <DisabledActionHint reason={awaitingOnboardingReason(gender)}>
        {setUp}
      </DisabledActionHint>
    );
  }

  return setUp;
}

function openingOf<Subject>(subject: Subject) {
  return (current: Opening<Subject> | null): Opening<Subject> => ({
    open: true,
    openings: (current?.openings ?? 0) + 1,
    subject,
  });
}

function ruleLineOf({ hour, weekday }: WeeklyCheckInSeries): string {
  return `Every ${WEEKDAY_LABELS[weekday].full} at ${formatClockHour(hour)}`;
}

function coachingEndsLineOf(
  gender: VisitorGender,
  scheduling: CheckInScheduling,
): string {
  const coaching = scheduling === "ended" ? "has ended" : "is ending";

  return `${possessivePronoun(gender).capitalised} coaching ${coaching}, so no weekly check-in can be set up.`;
}
