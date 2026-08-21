import { useEffect, useMemo, useRef } from 'react';
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
  const slotsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const availableSlots = useMemo(
    () => (selectedDate ? buildTimeSlots(timeSlots, bookedSlots) : []),
    [selectedDate, timeSlots, bookedSlots]
  );

  // When a date becomes selected (or changes), bring the time-slots section
  // into view so the next step is obvious — on mobile the slots otherwise
  // sit below the fold and the picker looks frozen.
  useEffect(() => {
    if (!selectedDate) return;
    const id = window.requestAnimationFrame(() => {
      slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    onDateChange(date);
    onTimeChange('');
  };

  const handleChangeDate = () => {
    calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className="flex flex-col lg:flex-row lg:justify-center gap-8">
      {/* Calendar — capped to a stable width so day cells stay the same size
          before and after a date is picked (the time-slots column no longer
          shrinks it). */}
      <div ref={calendarRef} className="w-full max-w-[340px] mx-auto lg:mx-0 lg:w-[320px] lg:max-w-none shrink-0 scroll-mt-4">
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
        <p className="text-xs text-neutral-400 mt-4 text-center font-medium">All times shown in your local timezone</p>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <motion.div
          ref={slotsRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-[340px] mx-auto lg:max-w-none lg:w-[240px] lg:mx-0 scroll-mt-4"
        >
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">Pick a time</p>
              <h4 className="text-base font-semibold text-text-primary">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleChangeDate}
              className="lg:hidden text-xs font-semibold text-brand hover:underline"
            >
              Change date
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {availableSlots.length > 0 ? (
              availableSlots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={slot.isBooked}
                  onClick={() => onTimeChange(slot.time)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    slot.isBooked
                      ? 'bg-neutral-50 border-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
                      : selectedTime === slot.time
                        ? 'bg-neutral-800 border-neutral-800 text-white shadow-sm'
                        : 'bg-white border-brand/30 text-brand hover:border-brand hover:bg-brand/5'
                  }`}
                >
                  <span className={slot.isBooked ? 'line-through' : ''}>{slot.time}</span>
                  {slot.isBooked && <span className="text-[10px] uppercase tracking-wider ml-1">Booked</span>}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-neutral-500 italic py-4">
                <Clock size={14} />
                No available slots for this date.
              </div>
            )}
          </div>

          {/* Optional message field */}
          {showMessageField && selectedTime && (
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
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-brand bg-neutral-50 resize-none"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
