import { ChevronDown, ChevronRight } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { linkVariants } from '../ui/link';
import { cn } from '../ui/utils';

type InlineTextSize = 'sm' | 'base' | 'lg';
type InlineTextWeight = 'regular' | 'medium' | 'semibold';
type InlineTextTrailing = 'none' | 'disclosure' | 'onward';

const SIZE_CLASS: Record<InlineTextSize, string> = { sm: 'text-sm', base: 'text-base', lg: 'text-value-lg' };
const WEIGHT_CLASS: Record<InlineTextWeight, string> = { regular: '', medium: 'font-medium', semibold: 'font-semibold' };
const CHEVRON_CLASS = 'size-4 shrink-0 text-text-secondary';

function Trailing({ trailing }: { trailing: InlineTextTrailing }) {
  if (trailing === 'disclosure') {
    return <ChevronDown aria-hidden="true" className={cn(CHEVRON_CLASS, 'transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none')} />;
  }
  return trailing === 'onward' ? <ChevronRight aria-hidden="true" className={CHEVRON_CLASS} /> : null;
}

type InlineTextButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  size?: InlineTextSize;
  weight?: InlineTextWeight;
  trailing?: InlineTextTrailing;
  children: ReactNode;
};

export const InlineTextButton = forwardRef<HTMLButtonElement, InlineTextButtonProps>(
  ({ size = 'sm', weight = 'regular', trailing = 'none', className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn('group relative hit-area inline-flex items-center gap-1 rounded-field text-left text-text-primary', SIZE_CLASS[size], WEIGHT_CLASS[weight], className)}
      {...props}
    >
      <span className={cn(linkVariants({ variant: 'inline' }), 'min-w-0 group-aria-expanded:decoration-current')}>{children}</span>
      <Trailing trailing={trailing} />
    </button>
  ),
);
InlineTextButton.displayName = 'InlineTextButton';
