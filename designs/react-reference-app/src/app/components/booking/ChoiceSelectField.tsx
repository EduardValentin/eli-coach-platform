import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export type ChoiceOption = { value: string; label: string };

export function ChoiceSelectField({
  id,
  label,
  placeholder,
  value,
  options,
  error,
  autoComplete,
  onValueChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: readonly ChoiceOption[];
  error?: string;
  autoComplete?: string;
  onValueChange: (value: string) => void;
}) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} id={labelId} className="text-text-label font-medium">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} autoComplete={autoComplete}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-labelledby={labelId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              textValue={option.label}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={errorId} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
