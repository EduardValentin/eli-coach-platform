import {
  createContext,
  forwardRef,
  useContext,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { RadioGroup } from './ui/radio-group';
import { cn } from './ui/utils';

type ChoiceSize = 'xs' | 'sm' | 'md';

const GROUP_LOOKS = {
  segmented:
    'group/choice inline-flex w-full max-w-full flex-wrap rounded-field border border-control-border-soft bg-surface-quiet/50 p-[3px] gap-1 data-[size=xs]:gap-0.5',
  pill: 'flex w-fit items-center gap-2 rounded-full border border-control-border-soft bg-surface-base p-1 shadow-card',
} as const;

const OPTION_LOOKS = {
  segmented:
    'relative hit-area flex min-w-fit flex-1 min-h-[calc(var(--size-control-sm)-6px)] group-data-[size=md]/choice:min-h-[calc(var(--size-control-md)-8px)] group-data-[size=xs]/choice:min-h-[calc(var(--size-control-xs)-8px)] group-data-[size=xs]/choice:px-2 group-data-[size=xs]/choice:text-xs group-data-[size=xs]/choice:font-medium items-center justify-center rounded-[calc(var(--radius-field)-3px)] px-3 text-sm font-semibold text-text-label whitespace-nowrap outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-active-surface data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground data-[state=on]:bg-active-surface data-[state=on]:text-primary-foreground data-[state=on]:hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50',
  pill: "relative hit-area inline-flex min-w-0 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-copy-muted outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=unchecked]:hover:text-text-primary data-[state=checked]:bg-surface-inverted data-[state=checked]:text-surface-inverted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
} as const;

type ChoiceGroupLook = keyof typeof GROUP_LOOKS;

type ChoiceGroupProps = ComponentPropsWithoutRef<typeof RadioGroup> & {
  look?: ChoiceGroupLook;
  size?: ChoiceSize;
};

const ChoiceGroupLookContext = createContext<ChoiceGroupLook>('segmented');

export const ChoiceGroup = forwardRef<
  ElementRef<typeof RadioGroup>,
  ChoiceGroupProps
>(function ChoiceGroup({ className, look = 'segmented', size = 'sm', ...props }, ref) {
  return (
    <ChoiceGroupLookContext.Provider value={look}>
      <RadioGroup
        ref={ref}
        data-size={size}
        className={cn(GROUP_LOOKS[look], className)}
        loop
        orientation="horizontal"
        {...props}
      />
    </ChoiceGroupLookContext.Provider>
  );
});

type ChoiceOptionProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

export function ChoiceOption({
  className,
  children,
  ...props
}: ChoiceOptionProps) {
  const look = useContext(ChoiceGroupLookContext);

  return (
    <RadioGroupPrimitive.Item className={cn(OPTION_LOOKS[look], className)} {...props}>
      {children}
    </RadioGroupPrimitive.Item>
  );
}

type MultiChoiceGroupProps = Omit<ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>, 'type' | 'value' | 'defaultValue' | 'onValueChange'> & {
  'aria-label': string;
  value: string[];
  onValueChange: (value: string[]) => void;
  size?: ChoiceSize;
};

export function MultiChoiceGroup({ className, size = 'sm', ...props }: MultiChoiceGroupProps) {
  return <ToggleGroupPrimitive.Root type="multiple" data-size={size} className={cn(GROUP_LOOKS.segmented, className)} loop orientation="horizontal" {...props} />;
}

export function MultiChoiceOption({ className, children, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item className={cn(OPTION_LOOKS.segmented, className)} {...props}>
      {children}
    </ToggleGroupPrimitive.Item>
  );
}
