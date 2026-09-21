import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";

import { FieldError } from "./field-error";

export type ChoiceOption = {
  readonly label: string;
  readonly searchText?: string;
  readonly value: string;
};

type ChoiceSelectFieldProps = {
  autoComplete?: string;
  error: string | undefined;
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: readonly ChoiceOption[];
  placeholder: string;
  value: string;
};

export function ChoiceSelectField(props: ChoiceSelectFieldProps) {
  const {
    autoComplete,
    error,
    id,
    label,
    onValueChange,
    options,
    placeholder,
    value,
  } = props;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label className="font-medium text-text-label" htmlFor={id} id={labelId}>
        {label}
      </Label>
      <Select
        autoComplete={autoComplete}
        onValueChange={onValueChange}
        value={value}
      >
        <SelectTrigger
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-labelledby={labelId}
          id={id}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              textValue={option.searchText ?? option.label}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
