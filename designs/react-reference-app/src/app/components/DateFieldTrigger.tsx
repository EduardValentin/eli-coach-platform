import { forwardRef, type ComponentProps } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from './ui/utils';

const TRIGGER_CLASS =
  'flex h-12 w-full items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-base px-3 text-left text-base transition-[color,box-shadow] outline-none md:text-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive';

// Safari's default Tab order visits text fields only and skips buttons unless
// they carry an explicit tabindex; a control that stands in for a form field
// must stay reachable like the native field it replaces.
const FIELD_TAB_INDEX = 0;

type DateFieldTriggerProps = ComponentProps<'button'> & {
  text: string;
  placeholder: string;
};

export const DateFieldTrigger = forwardRef<
  HTMLButtonElement,
  DateFieldTriggerProps
>(({ text, placeholder, className, ...buttonProps }, ref) => (
  <button
    ref={ref}
    type="button"
    tabIndex={FIELD_TAB_INDEX}
    className={cn(TRIGGER_CLASS, className)}
    {...buttonProps}
  >
    <span className={cn(text.length === 0 && 'text-muted-foreground')}>
      {text.length === 0 ? placeholder : text}
    </span>
    <CalendarDays
      size={16}
      className="text-muted-foreground"
      aria-hidden="true"
    />
  </button>
));

DateFieldTrigger.displayName = 'DateFieldTrigger';
