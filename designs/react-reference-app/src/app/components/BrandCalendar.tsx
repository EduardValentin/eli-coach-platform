import { type ComponentProps } from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from './ui/utils';

const BRAND_CLASSNAMES = {
  months: 'flex flex-col w-full',
  month: 'flex flex-col gap-4 w-full',
  caption: 'flex justify-center pt-1 relative items-center w-full',
  caption_label: 'text-sm font-semibold text-[#121212]',
  nav: 'flex items-center gap-1',
  nav_button:
    'size-8 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors',
  nav_button_previous: 'absolute left-1',
  nav_button_next: 'absolute right-1',
  table: 'w-full border-collapse',
  head_row: 'flex w-full',
  head_cell:
    'text-neutral-400 rounded-md flex-1 h-10 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center',
  row: 'flex w-full mt-1',
  cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([aria-selected])]:rounded-xl',
  day: 'w-full aspect-square p-0 font-medium rounded-xl hover:bg-neutral-100 transition-colors aria-selected:opacity-100 inline-flex items-center justify-center relative',
  day_selected:
    'bg-[#C81D6B] text-white hover:bg-[#a31556] hover:text-white focus:bg-[#C81D6B] focus:text-white',
  day_today: 'ring-2 ring-[#C81D6B]/30',
  day_outside: 'text-neutral-300 hover:bg-neutral-50',
  day_disabled: 'text-neutral-300 opacity-50 hover:bg-transparent',
};

interface BrandCalendarProps extends ComponentProps<typeof DayPicker> {}

export function BrandCalendar({ classNames, className, showOutsideDays = true, ...props }: BrandCalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-full', className)}
      classNames={{ ...BRAND_CLASSNAMES, ...classNames }}
      {...props}
    />
  );
}
