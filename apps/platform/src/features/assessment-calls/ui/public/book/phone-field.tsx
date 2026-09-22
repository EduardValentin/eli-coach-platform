import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";
import type { ChangeEvent } from "react";

import { COUNTRIES } from "~/features/assessment-calls/contracts/countries";

import { FieldError } from "./field-error";

const PHONE_FIELD_LABEL = "Phone (optional)";
const CALLING_CODE_LABEL = "Country calling code";
const PHONE_NUMBER_LABEL = "Phone number";

type PhoneFieldProps = {
  country: string;
  error: string | undefined;
  id: string;
  number: string;
  onCountryChange: (code: string) => void;
  onNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function PhoneField(props: PhoneFieldProps) {
  const { country, error, id, number, onCountryChange, onNumberChange } = props;
  const countryId = `${id}-country`;
  const numberId = `${id}-number`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <fieldset className="space-y-2" data-parity-root="PhoneField">
      <legend className="mb-2 text-sm leading-none font-medium text-text-label">
        {PHONE_FIELD_LABEL}
      </legend>
      <div className="flex gap-2">
        <Select
          autoComplete="tel-country-code"
          onValueChange={onCountryChange}
          value={country}
        >
          <SelectTrigger
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            aria-label={CALLING_CODE_LABEL}
            className="w-[7.5rem] shrink-0"
            id={countryId}
          >
            <SelectValue placeholder="+" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((option) => (
              <SelectItem
                key={option.code}
                textValue={option.name}
                value={option.code}
              >
                {`${option.callingCode} ${option.code}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-label={PHONE_NUMBER_LABEL}
          autoComplete="tel-national"
          id={numberId}
          inputMode="tel"
          onChange={onNumberChange}
          placeholder="712 345 678"
          type="tel"
          value={number}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
