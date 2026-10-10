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
  type CheckInRefusalReply,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";

type CheckInRefusal = CheckInRefusalReply["error"];

type CheckInPickerProblem = CheckInRefusal | "failed";

type CheckInChoice = {
  note: string;
  startsAt: string;
};

export type CheckInPickerWording = {
  busyLabel: string;
  description: string;
  noteLabel: string;
  problemCopy: Partial<Record<CheckInRefusal, string>> & { failed: string };
  stepVerb: string;
  title: string;
};

type CheckInPickerSubmission = {
  action: string;
  bodyOf: (choice: CheckInChoice) => Record<string, string>;
};

type CheckInPickerProps = {
  onOpenChange: (open: boolean) => void;
  onSubmitted: (startsAt: string) => void;
  open: boolean;
  submission: CheckInPickerSubmission;
  timeZone: string;
  wording: CheckInPickerWording;
};

type OpenTimes =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; times: readonly string[] };

type ChoiceSubmissionOptions = {
  onSubmitted: (startsAt: string) => void;
  onTimeTaken: () => void;
  submission: CheckInPickerSubmission;
};

const TIME_TAKEN_COPY = "That time is no longer free. Pick another one.";

const NO_TIMES: readonly string[] = [];

export function CheckInPicker({
  onOpenChange,
  onSubmitted,
  open,
  submission,
  timeZone,
  wording,
}: CheckInPickerProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const openTimes = useOpenTimes();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const sending = useChoiceSubmission({
    onSubmitted: (startsAt) => {
      onOpenChange(false);
      onSubmitted(startsAt);
    },
    onTimeTaken: () => {
      setSelectedSlot(null);
      openTimes.load();
    },
    submission,
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

    sending.submit({ note, startsAt: selectedSlot });
  };

  const chooseDay = (chosen: string | null) => {
    setSelectedDayKey(chosen);
    setSelectedSlot(null);
  };

  const chooseSlot = (slot: string) => {
    setSelectedSlot(slot);
    sending.clearProblem();
  };

  return (
    <ResponsiveSheetDialog
      description={wording.description}
      dismissal={sending.submitting ? "locked" : "allowed"}
      initialFocus={title}
      onOpenChange={onOpenChange}
      open={open}
      title={wording.title}
      width="fit"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-parity-root="CheckinSchedulerSheet"
      >
        <SheetDialogHeader
          description={wording.description}
          rule="faint"
          title={wording.title}
          titleRef={title}
        />
        <SheetDialogBody>
          {sending.problem && (
            <Alert className="mb-6">
              <p>{problemCopyOf(sending.problem, wording)}</p>
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
          <NoteField
            label={wording.noteLabel}
            note={note}
            onNoteChange={setNote}
          />
        </SheetDialogBody>
        <SheetDialogFooter rule="faint">
          <Button
            aria-busy={sending.submitting || undefined}
            corner="control"
            disabled={
              openTimes.listing.status !== "ready" ||
              !selectedSlot ||
              sending.submitting
            }
            elevation="card"
            onClick={submit}
            press="scale"
            size="md-grow"
            textSize="sm"
            weight="semibold"
            width="full"
          >
            {sending.submitting
              ? wording.busyLabel
              : stepLabel({
                  dayKey,
                  stepVerb: wording.stepVerb,
                  time:
                    selectedSlot &&
                    formatClockTime(new Date(selectedSlot), timeZone),
                })}
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

function useChoiceSubmission({
  onSubmitted,
  onTimeTaken,
  submission,
}: ChoiceSubmissionOptions) {
  const fetcher = useFetcher<unknown>();
  const [submittedSlot, setSubmittedSlot] = useState<string | null>(null);
  const [problem, setProblem] = useState<CheckInPickerProblem | null>(null);

  const showProblem = (shown: CheckInPickerProblem) => {
    setProblem(shown);
    if (shown === "time_taken") {
      onTimeTaken();
    }
  };

  const applyReply = useEffectEvent((reply: unknown) => {
    if (!submittedSlot) return;

    if (checkInOutcomeSchema.safeParse(reply).success) {
      onSubmitted(submittedSlot);
      return;
    }

    const refusal = checkInRefusalSchema.safeParse(reply);
    showProblem(refusal.success ? refusal.data.error : "failed");
  });

  useEffect(() => {
    if (fetcher.data !== undefined) {
      applyReply(fetcher.data);
    }
  }, [fetcher.data]);

  const submit = (choice: CheckInChoice) => {
    setProblem(null);
    setSubmittedSlot(choice.startsAt);
    void fetcher.submit(submission.bodyOf(choice), {
      action: submission.action,
      encType: "application/json",
      method: "post",
    });
  };

  return {
    clearProblem: () => setProblem(null),
    problem,
    submit,
    submitting: fetcher.state !== "idle",
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

function problemCopyOf(
  problem: CheckInPickerProblem,
  wording: CheckInPickerWording,
): string {
  if (problem === "time_taken") return TIME_TAKEN_COPY;

  return wording.problemCopy[problem] ?? wording.problemCopy.failed;
}

function stepLabel({
  dayKey,
  stepVerb,
  time,
}: {
  dayKey: string | null;
  stepVerb: string;
  time: string | null;
}): string {
  if (!dayKey) return "Select a date";
  if (!time) return "Select a time";

  return `${stepVerb} ${time}`;
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
  label,
  note,
  onNoteChange,
}: {
  label: string;
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
        {label}
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
