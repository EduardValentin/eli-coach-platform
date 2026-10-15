import type { LucideIcon } from "lucide-react";

import type { DataAttributes } from "../lib/data-attributes";
import { cn } from "../lib/cn";

type IconChoice<Key extends string> = {
  key: Key;
  label: string;
  icon: LucideIcon;
};

type IconChoiceGridProps<Key extends string> = DataAttributes & {
  options: readonly IconChoice<Key>[];
  value: Key;
  onChange: (key: Key) => void;
  "aria-labelledby": string;
};

export function IconChoiceGrid<Key extends string>({
  options,
  value,
  onChange,
  ...attributes
}: IconChoiceGridProps<Key>) {
  return (
    <ul className="flex flex-wrap gap-2" {...attributes}>
      {options.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <button
            aria-label={label}
            aria-pressed={value === key}
            className={cn(
              "flex size-9 items-center justify-center rounded-compact border transition-colors",
              {
                "border-primary bg-primary-soft text-primary": value === key,
                "border-border-default text-text-secondary hover:bg-surface-muted":
                  value !== key,
              },
            )}
            onClick={() => onChange(key)}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
