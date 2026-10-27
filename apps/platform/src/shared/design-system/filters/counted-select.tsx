import type { FieldSize } from "../primitives/field-size";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select";

type CountedSelectProps<Value extends string> = {
  countParity?: (option: Value) => string;
  counts: Readonly<Record<Value, number>>;
  label: string;
  labels: Readonly<Record<Value, string>>;
  onChoose: (value: Value) => void;
  options: readonly Value[];
  size?: FieldSize;
  triggerParity?: string;
  value: Value;
};

export function CountedSelect<Value extends string>({
  countParity,
  counts,
  label,
  labels,
  onChoose,
  options,
  size = "sm",
  triggerParity,
  value,
}: CountedSelectProps<Value>) {
  const choose = (chosen: string) => {
    const option = options.find((candidate) => candidate === chosen);

    if (option !== undefined) {
      onChoose(option);
    }
  };

  return (
    <Select onValueChange={choose} value={value}>
      <SelectTrigger aria-label={label} data-parity={triggerParity} size={size}>
        <SelectValue>{labels[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            count={counts[option]}
            countParity={countParity?.(option)}
            key={option}
            value={option}
          >
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
