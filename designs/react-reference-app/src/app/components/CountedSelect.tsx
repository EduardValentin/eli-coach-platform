import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function CountedSelect<Value extends string>({
  label,
  value,
  options,
  labels,
  counts,
  onChoose,
}: {
  label: string;
  value: Value;
  options: readonly Value[];
  labels: Record<Value, string>;
  counts: Record<Value, number>;
  onChoose: (value: Value) => void;
}) {
  return (
    <Select value={value} onValueChange={(chosen) => onChoose(chosen as Value)}>
      <SelectTrigger aria-label={label} size="sm" className="w-full">
        <SelectValue>{labels[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            <span className="flex items-center gap-2">
              {labels[option]} <Badge tone="count">{counts[option]}</Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
