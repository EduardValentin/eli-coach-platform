import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { Weekday } from "@eli-coach-platform/domain/coach-availability";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { Button, DisabledActionHint } from "@eli-coach-platform/ui/primitives";
import { CalendarRange } from "lucide-react";
import { useRef, useState, type RefObject } from "react";

import type {
  CheckInScheduling,
  CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";
import { formatClockHour } from "~/features/assessment-calls/public/call-moment";
import { possessivePronoun } from "~/features/assessment-calls/public/visitor-profile";
import { awaitingOnboardingReason } from "~/features/check-ins/ui/coach/shared/awaiting-onboarding-reason";
import { useCoachCheckInMenu } from "~/features/check-ins/ui/coach/shared/coach-check-in-menu";
import { CheckInRow } from "~/features/check-ins/ui/shared/check-ins/check-in-row";
import { clientFullName } from "~/features/clients/public/clients";
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
    lastName: string;
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

type SeriesActionsProps = {
  coachingEnds: boolean;
  gender: VisitorGender;
  onChange: (target: WeeklyCheckInTarget) => void;
  onStop: (seriesId: string) => void;
  primaryActionRef: RefObject<HTMLButtonElement | null>;
  scheduling: CheckInScheduling;
  series: WeeklyCheckInSeries | null;
  stopRef: RefObject<HTMLButtonElement | null>;
};

type SeriesWeeksProps = {
  client: WeeklyCheckInPanelProps["client"];
  menuOf: ReturnType<typeof useCoachCheckInMenu>["menuOf"];
  timeZone: string;
  weeks: CoachClientSeriesPanel["weeks"];
};

export function WeeklyCheckInPanel({
  client,
  scheduling,
  suggestedWeekday,
  weekly,
}: WeeklyCheckInPanelProps) {
  const timeZone = useCalendarDayTimeZone();
  const { dialogs, menuOf } = useCoachCheckInMenu();
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);
  const [seriesDialog, setSeriesDialog] =
    useState<Opening<WeeklyCheckInTarget> | null>(null);
  const [stopConfirmation, setStopConfirmation] =
    useState<Opening<string> | null>(null);
  const coachingEnds = weekly.coachingEnds || scheduling === "ended";
  const series = coachingEnds ? null : weekly.series;

  return (
    <PortalWidget
      className="mb-8"
      data-parity-root="WeeklyCheckinPanel"
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
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-parity="series-summary"
      >
        <SeriesSummary
          coachingEnds={coachingEnds}
          gender={client.gender}
          scheduling={scheduling}
          series={series}
        />
        <SeriesActions
          coachingEnds={coachingEnds}
          gender={client.gender}
          onChange={(target) => setSeriesDialog(openingOf(target))}
          onStop={(seriesId) => setStopConfirmation(openingOf(seriesId))}
          primaryActionRef={primaryActionRef}
          scheduling={scheduling}
          series={series}
          stopRef={stopRef}
        />
      </div>

      {series && (
        <SeriesWeeks
          client={client}
          menuOf={menuOf}
          timeZone={timeZone}
          weeks={weekly.weeks}
        />
      )}

      {seriesDialog && (
        <WeeklyCheckInDialog
          client={client}
          key={seriesDialog.openings}
          onOpenChange={(open) =>
            setSeriesDialog((current) => current && { ...current, open })
          }
          open={seriesDialog.open}
          suggestedWeekday={suggestedWeekday}
          target={seriesDialog.subject}
        />
      )}

      {stopConfirmation && (
        <StopWeeklyCheckInDialog
          clientFirstName={client.firstName}
          key={stopConfirmation.openings}
          onOpenChange={(open) =>
            setStopConfirmation((current) => current && { ...current, open })
          }
          open={stopConfirmation.open}
          returnFocusTo={series ? stopRef : primaryActionRef}
          seriesId={stopConfirmation.subject}
        />
      )}

      {dialogs}
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

  if (series) {
    return (
      <p
        className="text-sm font-semibold text-text-primary"
        data-parity="series-rule"
      >
        {ruleLineOf(series)}
      </p>
    );
  }

  return (
    <p className="text-sm text-text-secondary" data-parity="series-empty">
      No weekly check-in yet.
    </p>
  );
}

function SeriesActions(props: SeriesActionsProps) {
  if (props.coachingEnds) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" data-parity="series-actions">
      <SeriesActionButtons {...props} />
    </div>
  );
}

function SeriesActionButtons({
  gender,
  onChange,
  onStop,
  primaryActionRef,
  scheduling,
  series,
  stopRef,
}: SeriesActionsProps) {
  if (series) {
    return (
      <>
        <Button
          data-parity="series-change"
          onClick={() => onChange({ mode: "change", series })}
          ref={primaryActionRef}
          size="sm"
          variant="outline"
        >
          Change
        </Button>
        <Button
          data-parity="series-stop"
          onClick={() => onStop(series.id)}
          ref={stopRef}
          size="sm"
          variant="destructive-outline"
        >
          Stop
        </Button>
      </>
    );
  }

  const setUp = (
    <Button
      data-parity="series-set-up"
      onClick={() => onChange({ mode: "set-up" })}
      ref={primaryActionRef}
      size="sm"
      variant="outline"
    >
      Set up
    </Button>
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

function SeriesWeeks({ client, menuOf, timeZone, weeks }: SeriesWeeksProps) {
  if (weeks.length === 0) {
    return (
      <p
        className="mt-5 text-sm text-text-secondary"
        data-parity="series-weeks-empty"
      >
        No weeks to come.
      </p>
    );
  }

  return (
    <ul
      aria-label="Weeks to come"
      className="mt-5 space-y-3"
      data-parity="series-weeks"
    >
      {weeks.map((week) => (
        <li key={week.id}>
          <CheckInRow
            attendee={{ name: clientFullName(client) }}
            checkIn={week}
            menu={menuOf(week)}
            menuSize="xs"
            timeZone={timeZone}
            viewer={{ counterpartName: client.firstName, party: "coach" }}
          />
        </li>
      ))}
    </ul>
  );
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
