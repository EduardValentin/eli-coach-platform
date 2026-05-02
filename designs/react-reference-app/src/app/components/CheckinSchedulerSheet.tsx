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
  request: { Icon: CalendarPlus, eyebrow: 'Check-in request', tint: '#C81D6B' },
  reschedule: { Icon: RefreshCw, eyebrow: 'Reschedule proposal', tint: '#C81D6B' },
  schedule: { Icon: CalendarPlus, eyebrow: 'Coach scheduling', tint: '#C81D6B' },
};

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
  submitLabel,
  showMessageField,
  message,
  onMessageChange,
  messagePlaceholder,
}: CheckinSchedulerSheetProps) {
  const { Icon, eyebrow, tint } = VARIANT_META[variant];

  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="px-5 pt-6 pb-4 md:px-8 md:pt-8 border-b border-neutral-100">
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

      <div className="px-5 py-5 md:px-8 md:py-6 overflow-y-auto">
        <DateTimePicker
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          selectedTime={selectedTime}
          onTimeChange={onTimeChange}
          bookedSlots={bookedSlots}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          showMessageField={showMessageField}
          message={message}
          onMessageChange={onMessageChange}
          messagePlaceholder={messagePlaceholder}
        />
      </div>
    </ResponsiveSheetDialog>
  );
}
