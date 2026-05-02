import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';
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
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
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
  onSubmit,
  submitLabel = 'Request Check-in',
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
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* Calendar */}
      <div className="flex-1">
        <Calendar
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
          className="rounded-xl border border-neutral-100 shadow-sm w-full p-2 sm:p-3 md:p-4"
          classNames={{
            table: 'w-full',
            head_row: 'flex w-full',
            head_cell: 'flex-1 text-neutral-500 font-medium text-[0.75rem] text-center',
            row: 'flex w-full mt-1',
            cell: 'flex-1 aspect-square text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
            day: 'w-full h-full p-0 font-medium aria-selected:opacity-100 rounded-full hover:bg-neutral-100 transition-colors',
            day_selected: 'bg-[#C81D6B] text-white hover:bg-[#A31657] hover:text-white focus:bg-[#C81D6B] focus:text-white rounded-full font-semibold shadow-sm',
            day_today: 'bg-neutral-50 text-neutral-900',
            nav_button_previous: 'absolute left-1 border-neutral-200 hover:bg-neutral-100',
            nav_button_next: 'absolute right-1 border-neutral-200 hover:bg-neutral-100',
          }}
        />
        <p className="text-xs text-neutral-400 mt-4 text-center font-medium">All times shown in your local timezone</p>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full lg:w-[240px]"
        >
          <h4 className="font-medium text-neutral-700 mb-4 text-[15px]">
            {format(selectedDate, 'EEEE, MMM d')}
          </h4>

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
                        : 'bg-white border-[#C81D6B]/30 text-[#C81D6B] hover:border-[#C81D6B] hover:bg-[#C81D6B]/5'
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
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:border-[#C81D6B] bg-neutral-50 resize-none"
              />
            </motion.div>
          )}

          {/* Confirm action */}
          {selectedTime && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onSubmit}
              className="mt-4 w-full min-h-12 bg-[#C81D6B] text-white px-5 rounded-2xl font-semibold text-sm hover:bg-[#A31657] transition-colors shadow-sm"
            >
              {submitLabel} {selectedTime}
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
