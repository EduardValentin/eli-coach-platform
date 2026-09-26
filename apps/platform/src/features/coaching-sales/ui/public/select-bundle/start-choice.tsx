import { RadioGroup, RadioGroupItem } from "@eli-coach-platform/ui/primitives";
import { AlertCircle } from "lucide-react";
import { useId, type ReactNode, type Ref } from "react";
import { Link } from "react-router";

import {
  startChoiceSchema,
  type CheckoutChoice,
} from "~/features/coaching-sales/contracts/coaching-sales";
import { formatDayMonth } from "~/features/coaching-sales/ui/public/calendar-day-format";

import {
  IMMEDIATE_START_BODY,
  IMMEDIATE_START_LEAD,
  START_CHOICE_QUESTION,
  WAITING_START_BODY,
  WAITING_START_LEAD,
} from "./start-choice-copy";

type StartChoiceValue = CheckoutChoice["startChoice"];

type StartChoiceProps = {
  error: string | null;
  firstOptionRef: Ref<HTMLButtonElement>;
  onChange: (startChoice: StartChoiceValue) => void;
  value: StartChoiceValue | null;
  waitingStartsOn: string;
};

const TERMS_WITHDRAWAL_PATH =
  "/terms#immediate-digital-delivery-and-withdrawal";

export function StartChoice(props: StartChoiceProps) {
  const baseId = useId();
  const legendId = `${baseId}-legend`;
  const errorId = `${baseId}-error`;

  return (
    <fieldset className="text-left" data-parity-root="StartChoice">
      <legend
        className="mb-4 font-heading text-xl text-text-primary"
        id={legendId}
      >
        {START_CHOICE_QUESTION}
      </legend>

      <RadioGroup
        aria-describedby={props.error ? errorId : undefined}
        aria-invalid={props.error ? true : undefined}
        aria-labelledby={legendId}
        onValueChange={(next) => {
          const startChoice = startChoiceSchema.safeParse(next);

          if (startChoice.success) {
            props.onChange(startChoice.data);
          }
        }}
        value={props.value ?? ""}
      >
        <StartOption
          id={`${baseId}-immediate`}
          itemRef={props.firstOptionRef}
          lead={IMMEDIATE_START_LEAD}
          parityHook="option-immediate"
          value="immediate"
        >
          {IMMEDIATE_START_BODY}
        </StartOption>
        <StartOption
          id={`${baseId}-waiting`}
          lead={WAITING_START_LEAD}
          parityHook="option-waiting"
          value="waiting"
        >
          {WAITING_START_BODY}{" "}
          <strong className="font-semibold">
            {formatDayMonth(props.waitingStartsOn)}
          </strong>
          .
        </StartOption>
      </RadioGroup>

      {props.error ? (
        <p
          className="mt-3 flex items-start gap-2 text-sm leading-snug text-feedback-danger"
          data-parity="error"
          id={errorId}
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={16}
          />
          {props.error}
        </p>
      ) : null}

      <Link
        className="mt-4 inline-block text-sm font-medium text-brand-primary underline underline-offset-4 hover:text-brand-primary-hover"
        to={TERMS_WITHDRAWAL_PATH}
      >
        See how this works in the terms
      </Link>
    </fieldset>
  );
}

function StartOption(props: {
  children: ReactNode;
  id: string;
  itemRef?: Ref<HTMLButtonElement>;
  lead: string;
  parityHook: string;
  value: StartChoiceValue;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-card border border-stroke-faint bg-surface-base px-5 py-4 text-left shadow-card transition-[border-color,box-shadow] has-[[data-state=checked]]:border-brand-primary"
      data-parity={props.parityHook}
      htmlFor={props.id}
    >
      <RadioGroupItem
        className="mt-0.5"
        data-parity={`start-radio-${props.value}`}
        id={props.id}
        ref={props.itemRef}
        value={props.value}
      />
      <span className="flex flex-col gap-1 text-sm leading-relaxed text-text-primary">
        <span className="font-semibold">{props.lead}</span>
        <span>{props.children}</span>
      </span>
    </label>
  );
}
