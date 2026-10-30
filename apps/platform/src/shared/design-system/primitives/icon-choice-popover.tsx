import type { LucideIcon } from "lucide-react";
import { Smile, X } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { LABEL_CLASS } from "../lib/typography";
import { Button } from "./button";
import { iconChoiceClasses, type IconChoice } from "./icon-choice";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type IconOptionProps = {
  icon: LucideIcon;
  label: string;
  state: "chosen" | "resting";
  onChoose: () => void;
};

function IconOption({ icon: Icon, label, state, onChoose }: IconOptionProps) {
  return (
    <button
      aria-selected={state === "chosen"}
      className={cn(
        "flex flex-col items-center gap-0.5 p-1.5 text-xs",
        iconChoiceClasses({ state }),
        { "hover:text-text-primary": state === "resting" },
      )}
      data-focus-ring
      onClick={onChoose}
      role="option"
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
      <span className="leading-none">{label}</span>
    </button>
  );
}

type IconChoicePopoverProps<Key extends string> = DataAttributes & {
  options: readonly IconChoice<Key>[];
  value: Key | null;
  onChange: (key: Key | null) => void;
  label: string;
  noneLabel: string;
  triggerLabel: string;
};

export function IconChoicePopover<Key extends string>({
  options,
  value,
  onChange,
  label,
  noneLabel,
  triggerLabel,
  ...data
}: IconChoicePopoverProps<Key>) {
  const [open, setOpen] = useState(false);

  function choose(key: Key | null) {
    onChange(key);
    setOpen(false);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Smile aria-hidden="true" size={16} />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className={cn("mb-2", LABEL_CLASS)}>{label}</p>
        <div
          {...data}
          aria-label={label}
          className="grid grid-cols-5 gap-1"
          role="listbox"
        >
          <IconOption
            icon={X}
            label={noneLabel}
            onChoose={() => choose(null)}
            state={value === null ? "chosen" : "resting"}
          />
          {options.map(({ key, label: optionLabel, icon }) => (
            <IconOption
              icon={icon}
              key={key}
              label={optionLabel}
              onChoose={() => choose(key)}
              state={value === key ? "chosen" : "resting"}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
