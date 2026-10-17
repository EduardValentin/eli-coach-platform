import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { iconChoiceClasses, type IconChoice } from "./icon-choice";

const BORDERS = {
  chosen: "border-primary",
  resting: "border-border-default",
} as const;

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
      {options.map(({ key, label, icon: Icon }) => {
        const state = value === key ? "chosen" : "resting";

        return (
          <li key={key}>
            <button
              aria-label={label}
              aria-pressed={value === key}
              className={cn(
                "flex size-9 items-center justify-center border",
                iconChoiceClasses({ state }),
                BORDERS[state],
              )}
              onClick={() => onChange(key)}
              type="button"
            >
              <Icon aria-hidden="true" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
