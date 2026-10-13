import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { Weekday } from "@eli-coach-platform/domain/coach-availability";
import { TimeSlotButton } from "@eli-coach-platform/ui/calendar";
import {
  ResponsiveSheetDialog,
  SheetDialogBody,
  SheetDialogFooter,
  SheetDialogHeader,
} from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Alert,
  AlertAction,
  ChoiceGroup,
  ChoiceOption,
} from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { generatePath, useFetcher } from "react-router";

import { possessivePronoun } from "~/features/assessment-calls/public/visitor-profile";
import {
  checkInRefusalSchema,
  checkInSeriesOutcomeSchema,
  checkInSeriesPreviewSchema,
  type CheckInRefusalReply,
  type CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import { PickerStepButton } from "~/features/check-ins/ui/shared/check-ins/check-in-picker";
import {
  hourLabel,
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
} from "~/features/coach-schedule/public/coach-schedule-settings";

export type WeeklyCheckInSeries = NonNullable<CoachClientSeriesPanel["series"]>;

type WeeklyCheckInClient = {
  clientId: string;
  firstName: string;
  gender: VisitorGender;
};

export type WeeklyCheckInTarget =
  { mode: "set-up" } | { mode: "change"; series: WeeklyCheckInSeries };

type WeeklyCheckInMode = WeeklyCheckInTarget["mode"];

type SaveProblem = CheckInRefusalReply["error"] | "failed";

type SeriesHour = {
  clashes: number;
  hour: number;
};

type HoursListing =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; hours: readonly SeriesHour[] };

type WeeklyCheckInDialogProps = {
  client: WeeklyCheckInClient;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  suggestedWeekday: Weekday | null;
  target: WeeklyCheckInTarget;
};

type SeriesSavingOptions = {
  onRefused: (problem: SaveProblem) => void;
  onSaved: () => void;
};

type SeriesChoice = {
  hour: number;
  weekday: Weekday;
};

const FIELD_LABEL_CLASS = "mb-2 block text-sm font-medium text-text-primary";

const MODE_WORDING: Record<
  WeeklyCheckInMode,
  { action: string; busy: string; saved: string }
> = {
  "set-up": {
    action: "Set up",
    busy: "Setting up…",
    saved: "Weekly check-in set up",
  },
  change: {
    action: "Change",
    busy: "Changing…",
    saved: "Weekly check-in changed",
  },
};

export function WeeklyCheckInDialog({
  client,
  onOpenChange,
  open,
  suggestedWeekday,
  target,
}: WeeklyCheckInDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dayLabelId = useId();
  const hourLabelId = useId();
  const series = target.mode === "change" ? target.series : null;
  const [weekday, setWeekday] = useState<Weekday>(
    suggestedWeekday ?? series?.weekday ?? WEEKDAY_DISPLAY_ORDER[0],
  );
  const [hour, setHour] = useState<number | null>(null);
  const wording = MODE_WORDING[target.mode];
  const preview = useSeriesPreview(client.clientId);
  const saving = useSeriesSaving({
    onRefused: (problem) => {
      if (problem === "changed_meanwhile") preview.load(weekday);
    },
    onSaved: () => {
      toast.success(wording.saved);
      onOpenChange(false);
    },
  });
  const loadOnOpen = useEffectEvent(() => preview.load(weekday));

  const chooseWeekday = (value: Weekday) => {
    setWeekday(value);
    saving.clearProblem();
    preview.load(value);
  };

  const fallBackFromUnofferedWeekday = useEffectEvent(
    (offered: readonly Weekday[]) => {
      if (offered.includes(weekday)) return;

      const fallback = fallbackWeekday(offered, series);
      if (fallback) chooseWeekday(fallback);
    },
  );

  useEffect(() => {
    if (open) loadOnOpen();
  }, [open]);

  useEffect(() => {
    fallBackFromUnofferedWeekday(preview.offered);
  }, [preview.offered]);

  const chooseHour = (chosen: number) => {
    setHour(chosen);
    saving.clearProblem();
  };

  const save = () => {
    if (hour === null) return;

    saving.submit(client.clientId, target, { hour, weekday });
  };

  const listing =
    preview.listing.status === "ready" && !preview.offered.includes(weekday)
      ? LOADING
      : preview.listing;
  const title =
    target.mode === "set-up"
      ? `Set up a weekly check-in with ${client.firstName}`
      : "Change the weekly check-in";
  const description =
    target.mode === "set-up"
      ? `Pick the day and hour. Every week until ${possessivePronoun(client.gender).lower} paid period ends is booked.`
      : `Every week from the next ${WEEKDAY_LABELS[weekday].full} is moved.`;

  return (
    <ResponsiveSheetDialog
      description={description}
      dismissal={saving.submitting ? "locked" : "allowed"}
      initialFocus={titleRef}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
      width="fit"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-parity-root="WeeklyCheckinDialog"
      >
        <SheetDialogHeader
          description={description}
          rule="faint"
          title={title}
          titleRef={titleRef}
        />
        <SheetDialogBody>
          {saving.problem && (
            <Alert className="mb-6">
              <p>{problemCopyOf(saving.problem, client)}</p>
            </Alert>
          )}
          {preview.offered.length > 0 && (
            <>
              <p className={FIELD_LABEL_CLASS} id={dayLabelId}>
                Day
              </p>
              <ChoiceGroup
                aria-labelledby={dayLabelId}
                data-parity="series-weekday"
                disabled={saving.submitting}
                onValueChange={(value) => {
                  const chosen = preview.offered.find((day) => day === value);
                  if (chosen) chooseWeekday(chosen);
                }}
                value={weekday}
              >
                {preview.offered.map((day) => (
                  <ChoiceOption
                    aria-label={WEEKDAY_LABELS[day].full}
                    key={day}
                    value={day}
                  >
                    {WEEKDAY_LABELS[day].short}
                  </ChoiceOption>
                ))}
              </ChoiceGroup>
              <p className={cn("mt-6", FIELD_LABEL_CLASS)} id={hourLabelId}>
                Hour
              </p>
            </>
          )}
          <HourChoice
            hour={hour}
            labelledBy={hourLabelId}
            listing={listing}
            onChooseHour={chooseHour}
            onRetry={() => preview.load(weekday)}
          />
        </SheetDialogBody>
        <SheetDialogFooter rule="faint">
          <PickerStepButton
            busy={saving.submitting}
            disabled={listing.status !== "ready" || hour === null}
            label={saving.submitting ? wording.busy : wording.action}
            onSubmit={save}
          />
        </SheetDialogFooter>
      </div>
    </ResponsiveSheetDialog>
  );
}

const LOADING: HoursListing = { status: "loading" };

const NO_WEEKDAYS: readonly Weekday[] = [];

function useSeriesPreview(clientId: string) {
  const { data, load, state } = useFetcher<unknown>();
  const reply = checkInSeriesPreviewSchema.safeParse(data);
  const [offered, setOffered] = useState<readonly Weekday[]>(NO_WEEKDAYS);
  const offeredInReply = reply.success
    ? WEEKDAY_DISPLAY_ORDER.filter((day) => reply.data.weekdays.includes(day))
    : null;

  if (offeredInReply && !sameWeekdays(offeredInReply, offered)) {
    setOffered(offeredInReply);
  }

  return {
    listing: hoursListingOf(reply, { data, state }),
    load: (weekday: Weekday) => {
      void load(
        `${CHECK_INS_API_PATHS.seriesPreview}?${new URLSearchParams({ clientId, weekday })}`,
      );
    },
    offered,
  };
}

function useSeriesSaving({ onRefused, onSaved }: SeriesSavingOptions) {
  const fetcher = useFetcher<unknown>();
  const [problem, setProblem] = useState<SaveProblem | null>(null);

  const applyReply = useEffectEvent((reply: unknown) => {
    if (checkInSeriesOutcomeSchema.safeParse(reply).success) {
      onSaved();
      return;
    }

    const refusal = checkInRefusalSchema.safeParse(reply);
    const answered = refusal.success ? refusal.data.error : "failed";
    setProblem(answered);
    onRefused(answered);
  });

  useEffect(() => {
    if (fetcher.data !== undefined) {
      applyReply(fetcher.data);
    }
  }, [fetcher.data]);

  return {
    clearProblem: () => setProblem(null),
    problem,
    submit: (
      clientId: string,
      target: WeeklyCheckInTarget,
      choice: SeriesChoice,
    ) => {
      setProblem(null);
      void fetcher.submit(
        target.mode === "set-up" ? { clientId, ...choice } : choice,
        {
          action:
            target.mode === "set-up"
              ? CHECK_INS_API_PATHS.series
              : generatePath(CHECK_INS_API_PATHS.seriesChange, {
                  seriesId: target.series.id,
                }),
          encType: "application/json",
          method: target.mode === "set-up" ? "post" : "put",
        },
      );
    },
    submitting: fetcher.state !== "idle",
  };
}

function hoursListingOf(
  reply: ReturnType<typeof checkInSeriesPreviewSchema.safeParse>,
  { data, state }: { data: unknown; state: string },
): HoursListing {
  if (state !== "idle" || data === undefined) return LOADING;

  return reply.success
    ? { status: "ready", hours: reply.data.hours }
    : { status: "failed" };
}

function sameWeekdays(
  first: readonly Weekday[],
  second: readonly Weekday[],
): boolean {
  return (
    first.length === second.length &&
    first.every((day, index) => day === second[index])
  );
}

function fallbackWeekday(
  offered: readonly Weekday[],
  series: WeeklyCheckInSeries | null,
): Weekday | undefined {
  if (series && offered.includes(series.weekday)) return series.weekday;

  return offered[0];
}

function problemCopyOf(
  problem: SaveProblem,
  client: WeeklyCheckInClient,
): string {
  const copy: Partial<Record<SaveProblem, string>> = {
    series_exists: "A weekly check-in already exists.",
    outside_availability: "Pick a day and hour inside your availability.",
    nothing_to_create: `${possessivePronoun(client.gender).capitalised} paid period has no week left to book.`,
    client_cannot_answer: `${client.firstName} can't have a weekly check-in right now.`,
    changed_meanwhile: "The weekly check-in changed meanwhile.",
  };

  return copy[problem] ?? "The weekly check-in wasn't saved. Try again.";
}

function clashesLabel(clashes: number): string | null {
  if (clashes === 0) return null;

  return clashes === 1 ? "1 clash" : `${clashes} clashes`;
}

function HourChoice({
  hour,
  labelledBy,
  listing,
  onChooseHour,
  onRetry,
}: {
  hour: number | null;
  labelledBy: string;
  listing: HoursListing;
  onChooseHour: (hour: number) => void;
  onRetry: () => void;
}) {
  if (listing.status === "loading") {
    return (
      <p className="py-8 text-center text-sm text-text-secondary" role="status">
        Loading hours…
      </p>
    );
  }

  if (listing.status === "failed") {
    return (
      <Alert action={<AlertAction onClick={onRetry}>Try again</AlertAction>}>
        <p>We couldn&apos;t load the hours just now.</p>
      </Alert>
    );
  }

  return (
    <ul
      aria-labelledby={labelledBy}
      className="grid gap-2"
      data-parity="series-hours"
    >
      {listing.hours.map((offered) => {
        const clashes = clashesLabel(offered.clashes);

        return (
          <li key={offered.hour}>
            <TimeSlotButton
              detail={
                clashes ? { parity: "hour-clashes", text: clashes } : undefined
              }
              isSelected={hour === offered.hour}
              label={hourLabel(offered.hour)}
              onSelect={() => onChooseHour(offered.hour)}
            />
          </li>
        );
      })}
    </ul>
  );
}
