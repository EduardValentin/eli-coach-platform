import { MAX_CHECK_IN_NOTE_LENGTH } from "@eli-coach-platform/domain/check-in";
import { SlotPicker } from "@eli-coach-platform/ui/calendar";
import {
  ResponsiveSheetDialog,
  SheetDialogBody,
  SheetDialogFooter,
  SheetDialogHeader,
} from "@eli-coach-platform/ui/layout";
import { Alert, AlertAction, Button } from "@eli-coach-platform/ui/primitives";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFetcher } from "react-router";

import { formatClockTime } from "~/features/assessment-calls/public/call-moment";
import { useSlotPickerProps } from "~/features/assessment-calls/ui/shared/slot-picker-props";
import {
  checkInOutcomeSchema,
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

type CheckInRequest = {
  note: string;
  startsAt: string;
};

type RequestSubmissionOptions = {
  onRequested: (startsAt: string) => void;
  onTimeTaken: () => void;
  timeZone: string;
};

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
  const openTimes = useOpenTimes();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const submission = useCheckInRequestSubmission({
    onRequested: (startsAt) => {
      onOpenChange(false);
      onRequested(startsAt);
    },
    onTimeTaken: () => {
      setSelectedSlot(null);
      openTimes.load();
    },
    timeZone,
  });
  const times =
    openTimes.listing.status === "ready" ? openTimes.listing.times : NO_TIMES;
  const slotPickerProps = useSlotPickerProps(times, timeZone);
  const dayKey =
    selectedDayKey && slotPickerProps.days.has(selectedDayKey)
      ? selectedDayKey
      : null;
  const loadOpenTimesOnOpen = useEffectEvent(openTimes.load);

  useEffect(() => {
    if (open) {
      loadOpenTimesOnOpen();
    }
  }, [open]);

  const submit = () => {
    if (!selectedSlot) return;

    submission.submit({ note, startsAt: selectedSlot });
  };

  const chooseDay = (chosen: string | null) => {
    setSelectedDayKey(chosen);
    setSelectedSlot(null);
  };

  const chooseSlot = (slot: string) => {
    setSelectedSlot(slot);
    submission.clearProblem();
  };

  return (
    <ResponsiveSheetDialog
      description={DESCRIPTION}
      dismissal={submission.submitting ? "locked" : "allowed"}
      initialFocus={title}
      onOpenChange={onOpenChange}
      open={open}
      title={TITLE}
      width="fit"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-parity-root="CheckinSchedulerSheet"
      >
        <SheetDialogHeader
          description={DESCRIPTION}
          rule="faint"
          title={TITLE}
          titleRef={title}
        />
        <SheetDialogBody>
          {submission.problem && (
            <Alert className="mb-6">
              <p>{PROBLEM_COPY[submission.problem]}</p>
            </Alert>
          )}
          <OpenTimesPicker listing={openTimes.listing} onRetry={openTimes.load}>
            <SlotPicker
              {...slotPickerProps}
              onSelectDay={chooseDay}
              onSelectSlot={chooseSlot}
              selectedDayKey={dayKey}
              selectedSlot={selectedSlot}
            />
          </OpenTimesPicker>
          <NoteField note={note} onNoteChange={setNote} />
        </SheetDialogBody>
        <SheetDialogFooter rule="faint">
          <Button
            aria-busy={submission.submitting || undefined}
            corner="control"
            disabled={
              openTimes.listing.status !== "ready" ||
              !selectedSlot ||
              submission.submitting
            }
            elevation="card"
            onClick={submit}
            press="scale"
            size="md-grow"
            textSize="sm"
            weight="semibold"
            width="full"
          >
            {submission.submitting
              ? "Requesting…"
              : stepLabel(
                  dayKey,
                  selectedSlot &&
                    formatClockTime(new Date(selectedSlot), timeZone),
                )}
          </Button>
        </SheetDialogFooter>
      </div>
    </ResponsiveSheetDialog>
  );
}

function useOpenTimes() {
  const { data, load, state } = useFetcher<unknown>();

  return {
    listing: openTimesOf(data, state),
    load: () => {
      void load(CHECK_INS_API_PATHS.openTimes);
    },
  };
}

function useCheckInRequestSubmission({
  onRequested,
  onTimeTaken,
  timeZone,
}: RequestSubmissionOptions) {
  const request = useFetcher<unknown>();
  const [requestedSlot, setRequestedSlot] = useState<string | null>(null);
  const [problem, setProblem] = useState<RequestProblem | null>(null);

  const showProblem = (shown: RequestProblem) => {
    setProblem(shown);
    if (shown === "time_taken") {
      onTimeTaken();
    }
  };

  const applyRequestReply = useEffectEvent((reply: unknown) => {
    if (!requestedSlot) return;

    if (checkInOutcomeSchema.safeParse(reply).success) {
      onRequested(requestedSlot);
      return;
    }

    const refusal = checkInRefusalSchema.safeParse(reply);
    showProblem(refusal.success ? problemOf(refusal.data.error) : "failed");
  });

  useEffect(() => {
    if (request.data !== undefined) {
      applyRequestReply(request.data);
    }
  }, [request.data]);

  const submit = ({ note, startsAt }: CheckInRequest) => {
    setProblem(null);
    setRequestedSlot(startsAt);
    void request.submit(
      { note, startsAt, timeZone },
      {
        action: CHECK_INS_API_PATHS.requests,
        encType: "application/json",
        method: "post",
      },
    );
  };

  return {
    clearProblem: () => setProblem(null),
    problem,
    submit,
    submitting: request.state !== "idle",
  };
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
