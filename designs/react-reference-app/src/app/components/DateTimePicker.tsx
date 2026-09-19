import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { BrandCalendar } from './BrandCalendar';
import { to24h } from '../utils/dateFormatters';

const DEFAULT_TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

type TimeSlot = {
  time: string;
  isBooked: boolean;
};

type SlotPickerFrameProps = {
  calendar: ReactNode;
  timeZoneNote: string;
  dayHeading: string | null;
  DayHeading?: 'h3' | 'h4';
  revealScrollMargin?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function SlotPickerFrame({
  calendar,
  timeZoneNote,
  dayHeading,
  DayHeading = 'h4',
  revealScrollMargin = 'scroll-mt-4',
  children,
  footer,
}: SlotPickerFrameProps) {
  const slotsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const revealedDay = useRef(dayHeading);

  useEffect(() => {
    if (revealedDay.current === dayHeading) return;
    revealedDay.current = dayHeading;
    if (!dayHeading) return;
    const id = window.requestAnimationFrame(() => {
      slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [dayHeading]);

  const handleChangeDate = () => {
    calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col lg:flex-row lg:justify-center gap-8">
      <div ref={calendarRef} className={`w-full max-w-[340px] mx-auto lg:mx-0 lg:w-[320px] lg:max-w-none shrink-0 ${revealScrollMargin}`}>
        {calendar}
        <p className="text-xs text-text-secondary mt-4 text-center font-medium">{timeZoneNote}</p>
      </div>

      {dayHeading && (
        <motion.div
          ref={slotsRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`w-full max-w-[340px] mx-auto lg:max-w-none lg:w-[240px] lg:mx-0 ${revealScrollMargin}`}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <DayHeading className="text-base font-semibold text-text-primary">
                {dayHeading}
              </DayHeading>
            </div>
            <button
              type="button"
              onClick={handleChangeDate}
              className="lg:hidden text-xs font-semibold text-brand underline-offset-4 transition-colors duration-150 ease-out hover:text-brand-hover hover:underline"
            >
              Change date
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {children}
          </div>

          {footer}
        </motion.div>
      )}
    </div>
  );
}

type TimeSlotButtonProps = {
  label: string;
  isSelected: boolean;
  isBooked?: boolean;
  onSelect: () => void;
};

export function TimeSlotButton({ label, isSelected, isBooked = false, onSelect }: TimeSlotButtonProps) {
  return (
    <button
      type="button"
      disabled={isBooked}
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`w-full py-3 px-4 rounded-control text-sm font-medium transition-all duration-200 border ${
        isBooked
          ? 'bg-surface-base border-brand/30 text-brand pointer-events-none opacity-50'
          : isSelected
            ? 'bg-surface-strong border-surface-strong text-white shadow-card'
            : 'bg-surface-base border-brand/30 text-brand hover:border-brand hover:bg-brand/5'
      }`}
    >
      <span className={isBooked ? 'line-through' : ''}>{label}</span>
      {isBooked && <span className="text-[10px] uppercase tracking-wider ml-1">Booked</span>}
    </button>
  );
}

interface DateTimePickerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  selectedTime: string | null;
  onTimeChange: (time: string) => void;
  bookedSlots: string[];
  showMessageField?: boolean;
  message?: string;
  onMessageChange?: (msg: string) => void;
  messagePlaceholder?: string;
  disableWeekends?: boolean;
  maxDate?: Date;
  timeSlots?: string[];
}

function buildTimeSlots(slots: string[], bookedSlots: string[]): TimeSlot[] {
  return slots.map(time => ({
    time,
    isBooked: bookedSlots.includes(to24h(time)),
  }));
}

export function DateTimePicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  bookedSlots,
  showMessageField = false,
  message = '',
  onMessageChange,
  messagePlaceholder = 'Add a message (optional)',
  disableWeekends = false,
  maxDate,
  timeSlots = DEFAULT_TIME_SLOTS,
}: DateTimePickerProps) {
  const today = new Date();

  const availableSlots = useMemo(
    () => (selectedDate ? buildTimeSlots(timeSlots, bookedSlots) : []),
    [selectedDate, timeSlots, bookedSlots]
  );

  const handleDateSelect = (date: Date | undefined) => {
    onDateChange(date);
    onTimeChange('');
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <SlotPickerFrame
      calendar={
        <BrandCalendar
          mode="single"
          fixedWeeks
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (date < today) return true;
            if (maxDate && date > maxDate) return true;
            if (disableWeekends && isWeekend(date)) return true;
            return false;
          }}
        />
      }
      timeZoneNote="All times shown in your local timezone"
      dayHeading={selectedDate ? format(selectedDate, 'EEEE, MMMM d') : null}
      footer={
        showMessageField && selectedTime && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            <textarea
              value={message}
              onChange={(e) => onMessageChange?.(e.target.value)}
              placeholder={messagePlaceholder}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-control focus:outline-none bg-neutral-50 resize-none"
            />
          </motion.div>
        )
      }
    >
      {availableSlots.length > 0 ? (
        availableSlots.map(slot => (
          <TimeSlotButton
            key={slot.time}
            label={slot.time}
            isSelected={selectedTime === slot.time}
            isBooked={slot.isBooked}
            onSelect={() => onTimeChange(slot.time)}
          />
        ))
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-secondary italic py-4">
          <Clock size={14} />
          No available slots for this date.
        </div>
      )}
    </SlotPickerFrame>
  );
}
