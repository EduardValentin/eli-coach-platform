import { motion } from 'motion/react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { ResponsiveSheetDialog } from './workout/ResponsiveSheetDialog';
import { DateTimePicker } from './DateTimePicker';

type SheetVariant = 'request' | 'reschedule' | 'schedule';

interface CheckinSchedulerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: SheetVariant;
  title: string;
  description?: string;
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
}

const VARIANT_META: Record<SheetVariant, { Icon: typeof CalendarPlus; eyebrow: string; tint: string }> = {
  request: { Icon: CalendarPlus, eyebrow: 'Check-in request', tint: '#95134F' },
  reschedule: { Icon: RefreshCw, eyebrow: 'Reschedule proposal', tint: '#95134F' },
  schedule: { Icon: CalendarPlus, eyebrow: 'Coach scheduling', tint: '#95134F' },
};

function buildCtaLabel(
  selectedDate: Date | undefined,
  selectedTime: string | null,
  submitLabel: string
): string {
  if (!selectedDate) return 'Select a date';
  if (!selectedTime) return 'Select a time';
  return `${submitLabel} ${selectedTime}`;
}

export function CheckinSchedulerSheet({
  open,
  onOpenChange,
  variant,
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
}: CheckinSchedulerSheetProps) {
  const { Icon, eyebrow, tint } = VARIANT_META[variant];
  const ctaLabel = buildCtaLabel(selectedDate, selectedTime, submitLabel);
  const ctaDisabled = !selectedDate || !selectedTime;

  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      contentClassName="sm:w-fit"
    >
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-4 md:px-8 md:pt-8 border-b border-neutral-100">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon size={13} style={{ color: tint }} aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tint }}>
            {eyebrow}
          </span>
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-[#121212] pr-10 leading-snug">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">{description}</p>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
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
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3 md:px-8 md:py-4">
        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={ctaDisabled}
          whileTap={ctaDisabled ? undefined : { scale: 0.98 }}
          className="w-full min-h-12 px-5 rounded-2xl font-semibold text-sm transition-colors shadow-sm bg-[#95134F] text-white hover:bg-[#A31657] disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {ctaLabel}
        </motion.button>
      </div>
    </ResponsiveSheetDialog>
  );
}
