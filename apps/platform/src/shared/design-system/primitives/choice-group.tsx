import * as React from "react";
import { RadioGroup as RadixRadioGroup } from "radix-ui";

import { cn } from "../lib/cn";
import type { FieldSize } from "./field-size";
import { RadioGroup } from "./radio-group";

const GROUP_LOOKS = {
  segmented:
    "inline-flex w-full max-w-full flex-wrap gap-1 rounded-field border border-control-border-soft bg-surface-quiet/50 p-[3px]",
  pill: "flex w-fit items-center gap-2 rounded-full border border-control-border-soft bg-surface-base p-1 shadow-card",
} as const;

const OPTION_LOOKS = {
  segmented:
    "flex min-w-fit flex-1 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-field)-3px)] px-3 text-sm font-semibold text-text-secondary outline-none transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:text-primary-foreground",
  pill: "inline-flex min-w-0 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-copy-muted outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=unchecked]:hover:text-text-primary data-[state=checked]:bg-surface-inverted data-[state=checked]:text-text-inverted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
} as const;

type ChoiceGroupLook = keyof typeof GROUP_LOOKS;

type ChoiceGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroup> & {
  look?: ChoiceGroupLook;
  size?: FieldSize;
};

type ChoiceOptionProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
>;

const ChoiceGroupContext = React.createContext<{
  look: ChoiceGroupLook;
  size: FieldSize;
}>({ look: "segmented", size: "sm" });

export const ChoiceGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  ChoiceGroupProps
>(({ className, look = "segmented", size = "sm", ...props }, ref) => {
  const appearance = React.useMemo(() => ({ look, size }), [look, size]);

  return (
    <ChoiceGroupContext.Provider value={appearance}>
      <RadioGroup
        className={cn(GROUP_LOOKS[look], className)}
        loop
        orientation="horizontal"
        ref={ref}
        {...props}
      />
    </ChoiceGroupContext.Provider>
  );
});

ChoiceGroup.displayName = "ChoiceGroup";

export const ChoiceOption = React.forwardRef<
  React.ElementRef<typeof RadixRadioGroup.Item>,
  ChoiceOptionProps
>(({ className, ...props }, ref) => {
  const { look, size } = React.useContext(ChoiceGroupContext);

  return (
    <RadixRadioGroup.Item
      className={cn(
        OPTION_LOOKS[look],
        {
          "h-[calc(var(--size-control-sm)-6px)]":
            look === "segmented" && size === "sm",
          "h-[calc(var(--size-control-md)-8px)]":
            look === "segmented" && size === "md",
        },
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

ChoiceOption.displayName = "ChoiceOption";
