import { forwardRef, type ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { DisabledActionHint } from './DisabledActionHint';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type IconActionTone = 'default' | 'muted';

type IconActionButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  icon: LucideIcon;
  label: string;
  hint: string;
  tone?: IconActionTone;
  /** Why the action is unavailable: the button stays focusable and shows the reason on hover, focus and press. */
  disabledReason?: string;
};

const TONE_VARIANT = { default: 'ghost', muted: 'ghost-muted' } as const;

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(
  ({ icon: Icon, label, hint, tone = 'default', disabledReason, ...props }, ref) => {
    const button = (
      <Button ref={ref} variant={TONE_VARIANT[tone]} size="icon-xs" aria-label={label} {...props}>
        <Icon aria-hidden="true" />
      </Button>
    );
    if (disabledReason) return <DisabledActionHint reason={disabledReason}>{button}</DisabledActionHint>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    );
  },
);

IconActionButton.displayName = 'IconActionButton';
