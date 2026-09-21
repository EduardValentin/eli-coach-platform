import { COUNTRIES } from '../../services/countries';
import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const PHONE_FIELD_LABEL = 'Phone (optional)';
const CALLING_CODE_LABEL = 'Country calling code';
const PHONE_NUMBER_LABEL = 'Phone number';

export function PhoneField({
  id,
  country,
  number,
  error,
  onCountryChange,
  onNumberChange,
}: {
  id: string;
  country: string;
  number: string;
  error?: string;
  onCountryChange: (code: string) => void;
  onNumberChange: (number: string) => void;
}) {
  const countryId = `${id}-country`;
  const numberId = `${id}-number`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <fieldset className="space-y-2">
      <legend className="text-text-label text-sm font-medium leading-none mb-2">
        {PHONE_FIELD_LABEL}
      </legend>
      <div className="flex gap-2">
        <Select value={country} onValueChange={onCountryChange} autoComplete="tel-country-code">
          <SelectTrigger
            id={countryId}
            className="w-[7.5rem] shrink-0"
            aria-label={CALLING_CODE_LABEL}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="+" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((option) => (
              <SelectItem key={option.code} value={option.code} textValue={option.name}>
                {`${option.callingCode} ${option.code}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={numberId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label={PHONE_NUMBER_LABEL}
          placeholder="712 345 678"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        />
      </div>
      {error && (
        <p id={errorId} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
