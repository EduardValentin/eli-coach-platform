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
  announcement?: 'live' | 'none';
  availability: PrototypeWaitlistAvailability;
  variant: 'dark' | 'light';
};

export function WaitlistAvailabilityStatus({
  announcement = 'live',
  availability,
  variant,
}: WaitlistAvailabilityStatusProps) {
  if (availability === null) {
    return (
      <p
        className="text-center text-sm font-medium tracking-wide"
        role={announcement === 'none' ? undefined : 'alert'}
      >
        <span
          className={cn({
            "text-destructive": variant === "light",
            "text-destructive-on-inverted": variant === "dark",
          })}
        >
          We couldn't load waitlist availability right now. Please try again in a moment.
        </span>
      </p>
    );
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
      role={announcement === 'none' ? undefined : 'status'}
    >
      {availabilityLabels[availability]}
    </p>
  );
}
