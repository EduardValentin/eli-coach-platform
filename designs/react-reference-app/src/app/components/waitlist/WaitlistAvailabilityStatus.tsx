import type { PrototypeWaitlistAvailability } from '../../context/AppContext';
import { cn } from '../ui/utils';

const availabilityLabels = {
  available: 'Reduced-price spots available',
  limited: 'Limited spots',
  closed: 'Reduced-price spots closed',
} satisfies Record<
  Exclude<PrototypeWaitlistAvailability, null>,
  string
>;

type WaitlistAvailabilityStatusProps = {
  availability: PrototypeWaitlistAvailability;
  variant: 'dark' | 'light';
};

export function WaitlistAvailabilityStatus({
  availability,
  variant,
}: WaitlistAvailabilityStatusProps) {
  if (availability === null) {
    return null;
  }

  return (
    <p
      className={cn(
        'text-center text-sm font-medium tracking-wide',
        {
          'text-destructive': availability === 'closed' && variant === 'light',
          'text-destructive-on-inverted':
            availability === 'closed' && variant === 'dark',
          'text-surface-inverted-foreground/70':
            availability !== 'closed' && variant === 'dark',
          'text-copy-muted':
            availability !== 'closed' && variant === 'light',
        },
      )}
      role="status"
    >
      {availabilityLabels[availability]}
    </p>
  );
}
