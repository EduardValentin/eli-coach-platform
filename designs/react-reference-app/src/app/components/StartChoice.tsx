import { useId, type ReactNode, type Ref } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  withdrawalDeadline,
  type SubscriptionStartPath,
} from '../domain/coachingSubscription';
import {
  IMMEDIATE_START_BODY,
  IMMEDIATE_START_LEAD,
  START_CHOICE_QUESTION,
  WAITING_START_BODY,
  WAITING_START_LEAD,
} from '../domain/startChoiceCopy';
import { formatJourneyDate } from '../utils/journeyLabels';

function isStartPath(value: string): value is SubscriptionStartPath {
  return value === 'immediate' || value === 'waiting';
}

function StartOption({
  id,
  value,
  lead,
  children,
  itemRef,
}: {
  id: string;
  value: SubscriptionStartPath;
  lead: string;
  children: ReactNode;
  itemRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-card border border-stroke-faint bg-surface-base px-5 py-4 text-left shadow-card transition-[border-color,box-shadow] has-[[data-state=checked]]:border-brand"
      htmlFor={id}
    >
      <RadioGroupItem className="mt-0.5" id={id} ref={itemRef} value={value} />
      <span className="flex flex-col gap-1 text-sm leading-relaxed text-foreground">
        <span className="font-semibold">{lead}</span>
        <span>{children}</span>
      </span>
    </label>
  );
}

export function StartChoice({
  value,
  onChange,
  error,
  firstOptionRef,
}: {
  value: SubscriptionStartPath | null;
  onChange: (startPath: SubscriptionStartPath) => void;
  error: string | null;
  firstOptionRef: Ref<HTMLButtonElement>;
}) {
  const baseId = useId();
  const legendId = `${baseId}-legend`;
  const errorId = `${baseId}-error`;
  const startsOn = formatJourneyDate(withdrawalDeadline(new Date()));

  return (
    <fieldset className="text-left">
      <legend className="mb-4 font-serif text-xl text-foreground" id={legendId}>
        {START_CHOICE_QUESTION}
      </legend>

      <RadioGroup
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-labelledby={legendId}
        onValueChange={(next) => {
          if (isStartPath(next)) onChange(next);
        }}
        value={value ?? ''}
      >
        <StartOption
          id={`${baseId}-immediate`}
          itemRef={firstOptionRef}
          lead={IMMEDIATE_START_LEAD}
          value="immediate"
        >
          {IMMEDIATE_START_BODY}
        </StartOption>
        <StartOption
          id={`${baseId}-waiting`}
          lead={WAITING_START_LEAD}
          value="waiting"
        >
          {WAITING_START_BODY}{' '}
          <strong className="font-semibold">{startsOn}</strong>.
        </StartOption>
      </RadioGroup>

      {error && (
        <p
          className="mt-3 flex items-start gap-2 text-sm leading-snug text-destructive"
          id={errorId}
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={16}
          />
          {error}
        </p>
      )}

      <Link
        className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-hover"
        to="/terms#immediate-digital-delivery-and-withdrawal"
      >
        See how this works in the terms
      </Link>
    </fieldset>
  );
}
