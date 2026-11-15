"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { toggleVariants } from "./toggle";

const toggleGroupVariants = cva(
  "group/toggle-group flex w-fit items-center rounded-field data-[variant=outline]:shadow-xs",
  {
    variants: {
      spacing: {
        joined: "",
        separate: "flex-wrap gap-4",
      },
    },
    defaultVariants: {
      spacing: "joined",
    },
  },
);

const toggleGroupItemVariants = cva("", {
  variants: {
    spacing: {
      joined:
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-field last:rounded-r-field focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
      separate: "",
    },
  },
  defaultVariants: {
    spacing: "joined",
  },
});

type ToggleGroupStyle = VariantProps<typeof toggleVariants> &
  VariantProps<typeof toggleGroupVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupStyle>({
  size: "default",
  variant: "default",
  spacing: "joined",
});

function ToggleGroup({
  className,
  variant,
  size,
  spacing,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleGroupStyle) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(toggleGroupVariants({ spacing }), className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        toggleGroupItemVariants({ spacing: context.spacing }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
