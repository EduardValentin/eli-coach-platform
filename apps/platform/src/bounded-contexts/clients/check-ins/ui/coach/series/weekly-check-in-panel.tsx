import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";
import type { Weekday } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { VALUE_CLASS } from "~/shared/design-system/lib";
import {
  PortalWidget,
  WidgetAction,
  WidgetLink,
} from "~/shared/design-system/portal";
import {
  DisabledActionHint,
  RowActionsMenu,
} from "~/shared/design-system/primitives";
import { CalendarClock, CalendarRange, CalendarX } from "lucide-react";
import { useRef, useState, type RefObject } from "react";

import type {
  CheckInScheduling,
  CoachClientSeriesPanel,
} from "~/bounded-contexts/clients/check-ins/public/check-ins";
import { COACH_CHECK_INS_PATH } from "~/bounded-contexts/clients/check-ins/public/paths";
import { formatClockHour } from "~/shared/time-format/call-moment";
import { possessivePronoun } from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import { awaitingOnboardingReason } from "~/bounded-contexts/clients/check-ins/ui/coach/shared/awaiting-onboarding-reason";
import { WEEKDAY_LABELS } from "~/bounded-contexts/scheduling/coach-schedule/public/coach-schedule-settings";

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
      icon={CalendarRange}
      title="Weekly check-in"
    >
      <div data-parity="series-summary">
        <SeriesSummary
          coachingEnds={coachingEnds}
          gender={client.gender}
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
    <p className={VALUE_CLASS} data-parity="series-rule">
      {ruleLineOf(series)}
    </p>
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
