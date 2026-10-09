import { MAX_CHECK_IN_NOTE_LENGTH } from "@eli-coach-platform/domain/check-in";
import { SlotPicker } from "@eli-coach-platform/ui/calendar";
import { ResponsiveSheetDialog } from "@eli-coach-platform/ui/layout";
import { Alert, AlertAction, Button } from "@eli-coach-platform/ui/primitives";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useFetcher } from "react-router";

import { formatClockTime } from "~/features/assessment-calls/public/call-moment";
import { useSlotPickerDays } from "~/features/assessment-calls/ui/shared/slot-picker-days";
import {
  checkInAnswerSchema,
  checkInRefusalSchema,
  openCheckInTimesSchema,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

type CheckInRequestDialogProps = {
  onOpenChange: (open: boolean) => void;
  onRequested: (startsAt: string) => void;
  open: boolean;
  timeZone: string;
};

type RequestProblem = "time_taken" | "request_waiting" | "failed";

type OpenTimes =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; times: readonly string[] };

const TITLE = "Request a check-in";

const DESCRIPTION =
  "Pick a date and time that works for you. Your coach will approve or decline it.";

const NOTE_LABEL = "Add a note for your coach (optional)";

const PROBLEM_COPY: Record<RequestProblem, string> = {
  time_taken: "That time is no longer free. Pick another one.",
  request_waiting:
    "You already have a check-in request waiting. You can send another once it is answered.",
  failed: "Your request didn't go through. Try again.",
};

const NO_TIMES: readonly string[] = [];

export function CheckInRequestDialog({
  onOpenChange,
  onRequested,
  open,
  timeZone,
}: CheckInRequestDialogProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const openTimes = useOpenTimes(open);
  const request = useFetcher<unknown>();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<RequestProblem | null>(null);
  const [requestedSlot, setRequestedSlot] = useState<string | null>(null);
  const submitting = request.state !== "idle";
  const times =
    openTimes.listing.status === "ready" ? openTimes.listing.times : NO_TIMES;
  const pickerDays = useSlotPickerDays(times, timeZone);
  const dayKey =
    selectedDayKey && pickerDays.days.has(selectedDayKey)
      ? selectedDayKey
      : null;

  const refuse = (refusal: RequestProblem) => {
    setProblem(refusal);
    if (refusal !== "time_taken") return;

    setSelectedSlot(null);
    openTimes.reload();
  };

  const settle = useEffectEvent((answer: unknown) => {
    if (!requestedSlot) return;

    if (checkInAnswerSchema.safeParse(answer).success) {
      onOpenChange(false);
      onRequested(requestedSlot);
      return;
    }

    const refusal = checkInRefusalSchema.safeParse(answer);
    refuse(refusal.success ? problemOf(refusal.data.error) : "failed");
  });

  useEffect(() => {
    if (request.data !== undefined) {
      settle(request.data);
    }
  }, [request.data]);

  const submit = () => {
    if (!selectedSlot) return;

    setProblem(null);
    setRequestedSlot(selectedSlot);
    void request.submit(
      { note, startsAt: selectedSlot, timeZone },
      {
        action: CHECK_INS_API_PATHS.requests,
        encType: "application/json",
        method: "post",
      },
    );
  };

  const chooseDay = (chosen: string | null) => {
    setSelectedDayKey(chosen);
    setSelectedSlot(null);
  };

  const chooseSlot = (slot: string) => {
    setSelectedSlot(slot);
    setProblem(null);
  };

  return (
    <ResponsiveSheetDialog
      description={DESCRIPTION}
      dismissal={submitting ? "locked" : "allowed"}
      initialFocus={title}
      onOpenChange={onOpenChange}
      open={open}
      title={TITLE}
      width="fit"
    >
      <SchedulerFrame
        footer={
          <Button
            aria-busy={submitting || undefined}
            className="px-5 shadow-card"
            corner="control"
            disabled={
              openTimes.listing.status !== "ready" ||
              !selectedSlot ||
              submitting
            }
            onClick={submit}
            press="scale"
            size="md-grow"
            textSize="sm"
            weight="semibold"
            width="full"
          >
            {submitting
              ? "Requesting…"
              : stepLabel(
                  dayKey,
                  selectedSlot &&
                    formatClockTime(new Date(selectedSlot), timeZone),
                )}
          </Button>
        }
        titleRef={title}
      >
        {problem && (
          <Alert className="mb-6">
            <p>{PROBLEM_COPY[problem]}</p>
          </Alert>
        )}
        <OpenTimesPicker listing={openTimes.listing} onRetry={openTimes.reload}>
          <SlotPicker
            {...pickerDays}
            onSelectDay={chooseDay}
            onSelectSlot={chooseSlot}
            selectedDayKey={dayKey}
            selectedSlot={selectedSlot}
          />
        </OpenTimesPicker>
        <NoteField note={note} onNoteChange={setNote} />
      </SchedulerFrame>
    </ResponsiveSheetDialog>
  );
}

function useOpenTimes(open: boolean) {
  const { data, load, state } = useFetcher<unknown>();
  const reload = () => {
    void load(CHECK_INS_API_PATHS.openTimes);
  };
  const loadOnOpen = useEffectEvent(reload);

  useEffect(() => {
    if (open) {
      loadOnOpen();
    }
  }, [open]);

  return { listing: openTimesOf(data, state), reload };
}

function openTimesOf(data: unknown, state: string): OpenTimes {
  const parsed = openCheckInTimesSchema.safeParse(data);

  if (parsed.success) {
    return { status: "ready", times: parsed.data.times };
  }

  return data === undefined || state !== "idle"
    ? { status: "loading" }
    : { status: "failed" };
}

function problemOf(refusal: string): RequestProblem {
  return refusal === "time_taken" || refusal === "request_waiting"
    ? refusal
    : "failed";
}

function stepLabel(dayKey: string | null, time: string | null): string {
  if (!dayKey) return "Select a date";
  if (!time) return "Select a time";

  return `Request ${time}`;
}

function SchedulerFrame({
  children,
  footer,
  titleRef,
}: {
  children: ReactNode;
  footer: ReactNode;
  titleRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-parity-root="CheckinSchedulerSheet"
    >
      <div className="shrink-0 rounded-field border-b border-stroke-faint px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <h3
          className="pr-10 text-lg leading-snug font-semibold text-text-primary focus:outline-none md:text-xl"
          ref={titleRef}
          tabIndex={-1}
        >
          {TITLE}
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {DESCRIPTION}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        {children}
      </div>

      <div className="shrink-0 border-t border-stroke-faint bg-surface-base px-5 py-3 md:px-8 md:py-4">
        {footer}
      </div>
    </div>
  );
}

function OpenTimesPicker({
  children,
  listing,
  onRetry,
}: {
  children: ReactNode;
  listing: OpenTimes;
  onRetry: () => void;
}) {
  if (listing.status === "loading") {
    return (
      <p
        className="py-12 text-center text-sm text-text-secondary"
        role="status"
      >
        Loading open times…
      </p>
    );
  }

  if (listing.status === "failed") {
    return (
      <Alert action={<AlertAction onClick={onRetry}>Try again</AlertAction>}>
        <p>We couldn&apos;t load the open times just now.</p>
      </Alert>
    );
  }

  return (
    <>
      {listing.times.length === 0 && (
        <p className="mb-4 text-sm text-text-secondary">
          There are no open times in the next 30 days.
        </p>
      )}
      {children}
    </>
  );
}

function NoteField({
  note,
  onNoteChange,
}: {
  note: string;
  onNoteChange: (note: string) => void;
}) {
  const fieldId = useId();

  return (
    <div className="mt-6" data-parity="checkin-note-field">
      <label
        className="mb-2 block text-sm font-medium text-text-primary"
        htmlFor={fieldId}
      >
        {NOTE_LABEL}
      </label>
      <textarea
        className="w-full resize-none rounded-control border border-control-border-soft bg-surface-quiet px-3 py-2.5 text-sm focus:outline-none"
        id={fieldId}
        maxLength={MAX_CHECK_IN_NOTE_LENGTH}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={3}
        value={note}
      />
    </div>
  );
}
