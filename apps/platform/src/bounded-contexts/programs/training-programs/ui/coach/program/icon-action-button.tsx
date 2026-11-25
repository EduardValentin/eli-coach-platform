import type { LucideIcon } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/shared/design-system/primitives";

type IconActionButtonProps = Omit<
  ComponentProps<"button">,
  "children" | "aria-label"
> & {
  icon: LucideIcon;
  label: string;
  hint: string;
};

export const IconActionButton = forwardRef<
  HTMLButtonElement,
  IconActionButtonProps
>(({ icon: Icon, label, hint, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        ref={ref}
        size="icon-xs"
        variant="ghost"
        {...props}
      >
        <Icon aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{hint}</TooltipContent>
  </Tooltip>
));

IconActionButton.displayName = "IconActionButton";
