import { cn } from "~/shared/design-system/lib";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shared/design-system/primitives";

import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  type BlockType,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export function filledSessionsText(filled: number, total: number): string {
  return `${filled} of ${total} sessions`;
}

type BlockTypeSelectProps = {
  value: BlockType;
  label: string;
  appearance: "title" | "field";
  problemId?: string;
  onChange: (type: BlockType) => void;
};

function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}

export function BlockTypeSelect({
  value,
  label,
  appearance,
  problemId,
  onChange,
}: BlockTypeSelectProps) {
  return (
    <Select
      onValueChange={(next) => {
        if (isBlockType(next)) onChange(next);
      }}
      value={value}
    >
      <SelectTrigger
        aria-describedby={problemId}
        aria-invalid={problemId ? true : undefined}
        aria-label={label}
        className={cn({
          "w-auto min-w-0 bg-transparent px-2 text-left text-lg font-semibold whitespace-normal text-text-primary shadow-none hover:bg-surface-quiet md:text-lg [&>span:first-child]:line-clamp-2 [&>span:first-child]:whitespace-normal":
            appearance === "title",
          "w-full min-w-0 @3xl:w-auto @3xl:min-w-40": appearance === "field",
        })}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BLOCK_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {BLOCK_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
