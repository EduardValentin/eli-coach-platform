import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion } from 'motion/react';
import { ResponsiveSheetDialog } from './workout/ResponsiveSheetDialog';
import { DateTimePicker } from './DateTimePicker';
import { AssessmentSlotPicker } from './AssessmentSlotPicker';
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

function SchedulerFrame({
  title,
  description,
  titleRef,
  footer,
  children,
}: {
  title: string;
  description?: string;
  titleRef?: RefObject<HTMLHeadingElement>;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-parity-root="CheckinSchedulerSheet" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-5 pt-6 pb-4 md:px-8 md:pt-8 border-b border-neutral-100 rounded-field">
        <h3
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className="text-lg md:text-xl font-semibold text-text-primary pr-10 leading-snug focus:outline-none"
        >
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        {children}
      </div>

      <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3 md:px-8 md:py-4">
        {footer}
      </div>
    </div>
  );
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
    <motion.button
      type="button"
      onClick={onSubmit}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      whileTap={disabled || busy ? undefined : { scale: 0.98 }}
      className="w-full min-h-12 px-5 rounded-control font-semibold text-sm transition-colors shadow-sm bg-primary text-white hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
    >
      {label}
    </motion.button>
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
    <SchedulerFrame
      title={props.title}
      description={props.description}
      titleRef={titleRef}
      footer={
        <StepButton
          label={submitting ? 'Requesting…' : stepLabel(dayChosen, time, 'Request')}
          disabled={!ready || !selectedSlot}
          busy={submitting}
          onSubmit={props.onSubmit}
        />
      }
    >
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
    </SchedulerFrame>
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
    <SchedulerFrame
      title={title}
      description={description}
      footer={
        <StepButton
          label={stepLabel(Boolean(selectedDate), selectedTime, submitLabel)}
          disabled={!selectedDate || !selectedTime}
          onSubmit={onSubmit}
        />
      }
    >
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
    </SchedulerFrame>
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
      contentClassName="sm:w-fit"
      dismissal={submitting ? 'locked' : 'allowed'}
      initialFocus={props.variant === 'request' ? requestTitle : undefined}
    >
      {props.variant === 'request' ? (
        <RequestSheetContent {...props} titleRef={requestTitle} />
      ) : (
        <PickerSheetContent {...props} />
      )}
    </ResponsiveSheetDialog>
  );
}
