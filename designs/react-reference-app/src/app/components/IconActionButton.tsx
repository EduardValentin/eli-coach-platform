import { forwardRef, type ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type IconActionTone = 'default' | 'muted';

type IconActionButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  icon: LucideIcon;
  label: string;
  hint: string;
  tone?: IconActionTone;
};

const TONE_VARIANT = { default: 'ghost', muted: 'ghost-muted' } as const;

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(({ icon: Icon, label, hint, tone = 'default', ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button ref={ref} variant={TONE_VARIANT[tone]} size="icon-xs" aria-label={label} {...props}>
        <Icon aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{hint}</TooltipContent>
  </Tooltip>
));

IconActionButton.displayName = 'IconActionButton';
