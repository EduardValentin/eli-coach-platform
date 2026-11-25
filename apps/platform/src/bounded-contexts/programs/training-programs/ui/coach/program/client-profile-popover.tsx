import { UserRound } from "lucide-react";
import { useId, type ReactNode, type RefObject } from "react";

import {
  useReturnFocusToOpener,
  WIDGET_TITLE_CLASS,
} from "~/shared/design-system/lib";
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/design-system/primitives";

import type { ProgramDraftClientProfile } from "~/bounded-contexts/programs/training-programs/public/program-draft";

const TRAINING_DAY_LABELS: Record<
  ProgramDraftClientProfile["trainingDays"],
  string
> = {
  2: "2 days",
  3: "3 days",
  4: "4 days",
  5: "5+ days",
};

const SESSION_MINUTE_LABELS: Record<
  ProgramDraftClientProfile["sessionMinutes"],
  string
> = {
  30: "30 min",
  45: "45 min",
  60: "60 min",
};

function profileFacts(
  profile: ProgramDraftClientProfile | null,
): [string, string][] {
  if (!profile) return [];

  const facts: [string, string | null][] = [
    ["Goal", profile.goal],
    ["Equipment", profile.equipment.join(", ") || null],
    ["Place", profile.trainingPlace],
    ["Days per week", TRAINING_DAY_LABELS[profile.trainingDays]],
    ["Minutes per session", SESSION_MINUTE_LABELS[profile.sessionMinutes]],
    ["Limitations", profile.limitations || null],
  ];

  return facts.filter((fact): fact is [string, string] => fact[1] !== null);
}

export function ClientProfileTrigger() {
  return (
    <PopoverTrigger asChild>
      <Button
        aria-label="Client profile"
        className="max-sm:hidden"
        size="icon-sm"
        variant="ghost"
      >
        <UserRound aria-hidden="true" size={20} />
      </Button>
    </PopoverTrigger>
  );
}

type ClientProfilePopoverProps = {
  name: string;
  profile: ProgramDraftClientProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function ClientProfilePopover({
  name,
  profile,
  open,
  onOpenChange,
  returnFocus,
  children,
}: ClientProfilePopoverProps) {
  const headingId = useId();
  const facts = profileFacts(profile);
  const { returnFocusToOpener } = useReturnFocusToOpener(returnFocus);

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="end"
        aria-labelledby={headingId}
        className="grid w-80 gap-3 rounded-card"
        collisionPadding={16}
        onCloseAutoFocus={returnFocusToOpener}
        sideOffset={8}
      >
        <h2 className={WIDGET_TITLE_CLASS} id={headingId}>
          {name}
        </h2>
        {facts.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No coaching answers yet.
          </p>
        ) : (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            {facts.map(([term, detail]) => (
              <div className="contents" key={term}>
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
