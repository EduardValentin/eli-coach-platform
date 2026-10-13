import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { Weekday } from "@eli-coach-platform/domain/coach-availability";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { Button, DisabledActionHint } from "@eli-coach-platform/ui/primitives";
import { CalendarRange } from "lucide-react";
import { useRef, useState } from "react";

import type {
  CheckInScheduling,
  CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";
import { awaitingOnboardingReason } from "~/features/check-ins/ui/coach/shared/awaiting-onboarding-reason";
import { useCoachCheckInMenu } from "~/features/check-ins/ui/coach/shared/coach-check-in-menu";
import { CheckInRow } from "~/features/check-ins/ui/shared/check-ins/check-in-row";
import {
  hourLabel,
  WEEKDAY_LABELS,
} from "~/features/coach-schedule/public/coach-schedule-settings";

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
  const [editing, setEditing] = useState<Opening<WeeklyCheckInTarget> | null>(
    null,
  );
  const [stopping, setStopping] = useState<Opening<string> | null>(null);
  const series = scheduling === "ended" ? null : weekly.series;
  const weeks = series ? weekly.weeks : [];
  const fullName = `${client.firstName} ${client.lastName}`.trim();

  const openEditing = (target: WeeklyCheckInTarget) =>
    setEditing((current) => ({
      open: true,
      openings: (current?.openings ?? 0) + 1,
      subject: target,
    }));

  const openStopping = (seriesId: string) =>
    setStopping((current) => ({
      open: true,
      openings: (current?.openings ?? 0) + 1,
      subject: seriesId,
    }));

  const primaryAction = (
    <Button
      data-parity={series ? "series-change" : "series-set-up"}
      onClick={() =>
        openEditing(series ? { mode: "change", series } : { mode: "set-up" })
      }
      ref={primaryActionRef}
      size="sm"
      variant="outline"
    >
      {series ? "Change" : "Set up"}
    </Button>
  );

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
        {series ? (
          <p
            className="text-sm font-semibold text-text-primary"
            data-parity="series-rule"
          >
            {ruleLineOf(series)}
          </p>
        ) : (
          <p className="text-sm text-text-secondary" data-parity="series-empty">
            No weekly check-in yet.
          </p>
        )}
        {scheduling !== "ended" && (
          <div className="flex flex-wrap gap-2" data-parity="series-actions">
            {!series && scheduling === "awaiting_onboarding" ? (
              <DisabledActionHint
                reason={awaitingOnboardingReason(client.gender)}
              >
                {primaryAction}
              </DisabledActionHint>
            ) : (
              primaryAction
            )}
            {series && (
              <Button
                data-parity="series-stop"
                onClick={() => openStopping(series.id)}
                ref={stopRef}
                size="sm"
                variant="destructive-outline"
              >
                Stop
              </Button>
            )}
          </div>
        )}
      </div>

      {series &&
        (weeks.length > 0 ? (
          <ul
            aria-label="Weeks to come"
            className="mt-5 space-y-3"
            data-parity="series-weeks"
          >
            {weeks.map((week) => (
              <li key={week.id}>
                <CheckInRow
                  attendee={{ name: fullName }}
                  checkIn={week}
                  menu={menuOf(week)}
                  menuSize="xs"
                  timeZone={timeZone}
                  viewer={{ counterpartName: client.firstName, party: "coach" }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="mt-5 text-sm text-text-secondary"
            data-parity="series-weeks-empty"
          >
            No weeks to come.
          </p>
        ))}

      {editing && (
        <WeeklyCheckInDialog
          client={client}
          key={editing.openings}
          onOpenChange={(open) =>
            setEditing((current) => current && { ...current, open })
          }
          open={editing.open}
          suggestedWeekday={suggestedWeekday}
          target={editing.subject}
        />
      )}

      {stopping && (
        <StopWeeklyCheckInDialog
          clientFirstName={client.firstName}
          key={stopping.openings}
          onOpenChange={(open) =>
            setStopping((current) => current && { ...current, open })
          }
          open={stopping.open}
          returnFocusTo={series ? stopRef : primaryActionRef}
          seriesId={stopping.subject}
        />
      )}

      {dialogs}
    </PortalWidget>
  );
}

function ruleLineOf({ hour, weekday }: WeeklyCheckInSeries): string {
  return `Every ${WEEKDAY_LABELS[weekday].full} at ${hourLabel(hour)}`;
}
