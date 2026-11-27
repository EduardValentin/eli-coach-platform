import { useId, type ReactNode, type RefObject } from 'react';
import { UserRound } from 'lucide-react';
import { SESSION_MINUTE_LABELS, TRAINING_DAY_LABELS, type CoachingFacts } from '../../../domain/clientProfile';
import type { ClientJourney } from '../../../domain/journey';
import { journeyClientName } from '../../../utils/journeyLabels';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useReturnFocusToOpener } from '../../ui/use-return-focus-to-opener';

function profileFacts(coaching: CoachingFacts | null): [string, string][] {
  if (!coaching) return [];

  const facts: [string, string | null][] = [
    ['Goal', coaching.primaryGoal],
    ['Equipment', coaching.equipment.join(', ') || null],
    ['Place', coaching.trainingPlace],
    ['Days per week', TRAINING_DAY_LABELS[coaching.trainingDays]],
    ['Minutes per session', SESSION_MINUTE_LABELS[coaching.sessionMinutes]],
    ['Limitations', coaching.limitations || null],
  ];
  return facts.filter((fact): fact is [string, string] => fact[1] !== null);
}

export function ClientProfileTrigger() {
  return (
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label="Client profile" className="max-sm:hidden">
        <UserRound aria-hidden="true" size={20} />
      </Button>
    </PopoverTrigger>
  );
}

type ClientProfilePopoverProps = {
  journey: ClientJourney;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function ClientProfilePopover({ journey, open, onOpenChange, returnFocus, children }: ClientProfilePopoverProps) {
  const headingId = useId();
  const facts = profileFacts(journey.profile.coaching);
  const { returnFocusToOpener } = useReturnFocusToOpener(returnFocus);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        data-parity-root="ClientProfilePopover"
        align="end"
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={headingId}
        onCloseAutoFocus={returnFocusToOpener}
        className="grid w-80 gap-3 rounded-card"
      >
        <h2 id={headingId} className={WIDGET_TITLE_CLASS}>
          {journeyClientName(journey)}
        </h2>
        {facts.length === 0 ? (
          <p className="text-sm text-text-secondary">No coaching answers yet.</p>
        ) : (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            {facts.map(([term, detail]) => (
              <div key={term} className="contents">
                <dt className="text-text-secondary">{term}</dt>
                <dd className="text-text-primary">{detail}</dd>
              </div>
            ))}
          </dl>
        )}
      </PopoverContent>
    </Popover>
  );
}
