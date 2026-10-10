import { useId, useRef, useState, type RefObject } from 'react';
import {
  ResponsiveSheetDialog,
  SheetDialogBody,
  SheetDialogFooter,
  SheetDialogHeader,
} from './workout/ResponsiveSheetDialog';
import { DateTimePicker } from './DateTimePicker';
import { AssessmentSlotPicker } from './AssessmentSlotPicker';
import { Button } from './ThemeButton';
import { Alert, AlertAction } from './ui/alert';
import { formatSlotTime } from '../utils/dateFormatters';

export type OpenTimesListing =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; times: Date[] };

export const CHECKIN_NOTE_MAX_LENGTH = 500;

type SheetBase = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
};

type PickerSheetProps = SheetBase & {
  variant: 'reschedule' | 'schedule';
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  selectedTime: string | null;
  onTimeChange: (time: string) => void;
  bookedSlots: string[];
  onSubmit: () => void;
  submitLabel?: string;
  showMessageField?: boolean;
  message?: string;
  onMessageChange?: (msg: string) => void;
  messagePlaceholder?: string;
};

type RequestSheetProps = SheetBase & {
  variant: 'request';
  openTimes: OpenTimesListing;
  onRetry: () => void;
  timeZone: string;
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date | null) => void;
  note: string;
  onNoteChange: (note: string) => void;
  problem: string | null;
  submitting: boolean;
  onSubmit: () => void;
};

type CheckinSchedulerSheetProps = PickerSheetProps | RequestSheetProps;

const NOTE_LABEL = 'Add a note for your coach (optional)';

function stepLabel(dayChosen: boolean, time: string | null, submitLabel: string): string {
  if (!dayChosen) return 'Select a date';
  if (!time) return 'Select a time';
  return `${submitLabel} ${time}`;
}

function StepButton({
  label,
  disabled,
  busy = false,
  onSubmit,
}: {
  label: string;
  disabled: boolean;
  busy?: boolean;
  onSubmit: () => void;
}) {
  return (
    <Button
      onClick={onSubmit}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      corner="control"
      elevation="card"
      press="scale"
      size="md-grow"
      textSize="sm"
      weight="semibold"
      width="full"
    >
      {label}
    </Button>
  );
}

function NoteField({ note, onNoteChange }: { note: string; onNoteChange: (note: string) => void }) {
  const fieldId = useId();

  return (
    <div data-parity="checkin-note-field" className="mt-6">
      <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-text-primary">
        {NOTE_LABEL}
      </label>
      <textarea
        id={fieldId}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        maxLength={CHECKIN_NOTE_MAX_LENGTH}
        rows={3}
        className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-control focus:outline-none bg-neutral-50 resize-none"
      />
    </div>
  );
}

function OpenTimes({
  openTimes,
  onRetry,
  timeZone,
  selectedSlot,
  onSelectSlot,
  onSelectDay,
}: Pick<RequestSheetProps, 'openTimes' | 'onRetry' | 'timeZone' | 'selectedSlot' | 'onSelectSlot'> & {
  onSelectDay: (day: Date | undefined) => void;
}) {
  if (openTimes.status === 'loading') {
    return (
      <p role="status" className="py-12 text-center text-sm text-text-secondary">
        Loading open times…
      </p>
    );
  }

  if (openTimes.status === 'failed') {
    return (
      <Alert action={<AlertAction onClick={onRetry}>Try again</AlertAction>}>
        <p>We couldn&apos;t load the open times just now.</p>
      </Alert>
    );
  }

  return (
    <>
      {openTimes.times.length === 0 && (
        <p className="mb-4 text-sm text-text-secondary">
          There are no open times in the next 30 days.
        </p>
      )}
      <AssessmentSlotPicker
        slots={openTimes.times}
        timeZone={timeZone}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
        onSelectDay={onSelectDay}
      />
    </>
  );
}

function RequestSheetContent({
  titleRef,
  ...props
}: RequestSheetProps & { titleRef: RefObject<HTMLHeadingElement> }) {
  const [dayChosen, setDayChosen] = useState(false);
  const { selectedSlot, timeZone, submitting, problem } = props;
  const time = selectedSlot ? formatSlotTime(selectedSlot, timeZone) : null;
  const ready = props.openTimes.status === 'ready';

  return (
    <>
      <SheetDialogHeader
        title={props.title}
        description={props.description}
        rule="faint"
        titleRef={titleRef}
      />
      <SheetDialogBody>
        {problem && (
          <Alert className="mb-6">
            <p>{problem}</p>
          </Alert>
        )}
        <OpenTimes
          openTimes={props.openTimes}
          onRetry={props.onRetry}
          timeZone={timeZone}
          selectedSlot={selectedSlot}
          onSelectSlot={props.onSelectSlot}
          onSelectDay={(day) => setDayChosen(day !== undefined)}
        />
        <NoteField note={props.note} onNoteChange={props.onNoteChange} />
      </SheetDialogBody>
      <SheetDialogFooter rule="faint">
        <StepButton
          label={submitting ? 'Requesting…' : stepLabel(dayChosen, time, 'Request')}
          disabled={!ready || !selectedSlot}
          busy={submitting}
          onSubmit={props.onSubmit}
        />
      </SheetDialogFooter>
    </>
  );
}

function PickerSheetContent({
  title,
  description,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  bookedSlots,
  onSubmit,
  submitLabel = 'Confirm',
  showMessageField,
  message,
  onMessageChange,
  messagePlaceholder,
}: PickerSheetProps) {
  return (
    <>
      <SheetDialogHeader title={title} description={description} rule="faint" />
      <SheetDialogBody>
        <DateTimePicker
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          selectedTime={selectedTime}
          onTimeChange={onTimeChange}
          bookedSlots={bookedSlots}
          showMessageField={showMessageField}
          message={message}
          onMessageChange={onMessageChange}
          messagePlaceholder={messagePlaceholder}
        />
      </SheetDialogBody>
      <SheetDialogFooter rule="faint">
        <StepButton
          label={stepLabel(Boolean(selectedDate), selectedTime, submitLabel)}
          disabled={!selectedDate || !selectedTime}
          onSubmit={onSubmit}
        />
      </SheetDialogFooter>
    </>
  );
}

export function CheckinSchedulerSheet(props: CheckinSchedulerSheetProps) {
  const requestTitle = useRef<HTMLHeadingElement>(null);
  const submitting = props.variant === 'request' && props.submitting;

  return (
    <ResponsiveSheetDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      width="fit"
      dismissal={submitting ? 'locked' : 'allowed'}
      initialFocus={props.variant === 'request' ? requestTitle : undefined}
    >
      <div data-parity-root="CheckinSchedulerSheet" className="flex min-h-0 flex-1 flex-col">
        {props.variant === 'request' ? (
          <RequestSheetContent {...props} titleRef={requestTitle} />
        ) : (
          <PickerSheetContent {...props} />
        )}
      </div>
    </ResponsiveSheetDialog>
  );
}
