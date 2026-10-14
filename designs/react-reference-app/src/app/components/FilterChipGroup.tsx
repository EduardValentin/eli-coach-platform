import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
} from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './ui/utils';

const CHIP_SURFACE = 'border-control-border-soft bg-card py-2';

const chipVariants = cva(
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm text-text-primary outline-none transition-[background-color,border-color,color] duration-150 ease-out',
  {
    variants: {
      tone: {
        primary: `${CHIP_SURFACE} data-[state=off]:hover:border-primary data-[state=off]:hover:text-primary data-[state=on]:border-primary data-[state=on]:bg-active-surface data-[state=on]:text-primary-foreground`,
      },
    },
    defaultVariants: {
      tone: 'primary',
    },
  },
);

type FilterChipTone = NonNullable<VariantProps<typeof chipVariants>['tone']>;

const FilterChipToneContext = createContext<FilterChipTone>('primary');

type FilterChipGroupProps = Omit<
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>,
  'defaultValue' | 'onValueChange' | 'type' | 'value'
> & {
  'aria-label': string;
  onValueChange: (value: string | null) => void;
  tone?: FilterChipTone;
  value: string | null;
};

export const FilterChipGroup = forwardRef<HTMLDivElement, FilterChipGroupProps>(
  ({ className, onValueChange, tone = 'primary', value, ...props }, ref) => (
    <FilterChipToneContext.Provider value={tone}>
      <ToggleGroupPrimitive.Root
        ref={ref}
        className={cn('flex flex-wrap gap-2', className)}
        onValueChange={(values) => {
          const [pressedValue] = values.filter(
            (candidate) => candidate !== value,
          );

          onValueChange(pressedValue ?? null);
        }}
        type="multiple"
        value={value === null ? [] : [value]}
        {...props}
      />
    </FilterChipToneContext.Provider>
  ),
);

FilterChipGroup.displayName = 'FilterChipGroup';

type FilterChipProps = ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Item
>;

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, ...props }, ref) => {
    const tone = useContext(FilterChipToneContext);

    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        className={cn(chipVariants({ tone }), className)}
        {...props}
      />
    );
  },
);

FilterChip.displayName = 'FilterChip';
