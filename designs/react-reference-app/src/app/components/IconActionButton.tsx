import { forwardRef, type ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type IconActionButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  icon: LucideIcon;
  label: string;
  hint: string;
};

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(({ icon: Icon, label, hint, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button ref={ref} variant="ghost" size="icon-xs" aria-label={label} {...props}>
        <Icon aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{hint}</TooltipContent>
  </Tooltip>
));

IconActionButton.displayName = 'IconActionButton';
