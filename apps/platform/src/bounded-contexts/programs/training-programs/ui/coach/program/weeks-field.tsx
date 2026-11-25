import { cn, describedByOf } from "~/shared/design-system/lib";
import { Input } from "~/shared/design-system/primitives";
import { useId, useState, type ChangeEvent } from "react";

import type { Block } from "~/bounded-contexts/programs/training-programs/public/program-editing";

type WeeksFieldInput = { block: Block; onCommit: (weeks: number) => void };

export type WeeksFieldState = ReturnType<typeof useWeeksField>;

const DELOAD_WEEKS_HINT = "A deload is always 1 week";

function weeksFrom(raw: string): number | null {
  const weeks = Number(raw);

  return raw !== "" && Number.isInteger(weeks) && weeks >= 1 ? weeks : null;
}

export function useWeeksField({ block, onCommit }: WeeksFieldInput) {
  const [text, setText] = useState(String(block.weeks));
  const [shownWeeks, setShownWeeks] = useState(block.weeks);
  const hintId = useId();
  const isDeload = block.type === "deload";

  if (shownWeeks !== block.weeks) {
    setShownWeeks(block.weeks);
    setText(String(block.weeks));
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const weeks = weeksFrom(raw);
    setText(raw);
    if (weeks !== null) onCommit(weeks);
  }

  return {
    weeks: block.weeks,
    hint: isDeload ? { id: hintId, text: DELOAD_WEEKS_HINT } : null,
    inputProps: {
      type: "number",
      min: 1,
      value: text,
      disabled: isDeload,
      "aria-describedby": describedByOf(isDeload ? hintId : undefined),
      onChange: change,
      onBlur: () => setText(String(block.weeks)),
    },
  };
}

type WeeksFieldName = { label: string } | { labelledBy: string };

export function WeeksField({
  field,
  name,
}: {
  field: WeeksFieldState;
  name: WeeksFieldName;
}) {
  const naming =
    "label" in name
      ? { "aria-label": name.label }
      : { "aria-labelledby": name.labelledBy };

  return (
    <span className="flex items-center gap-1.5 text-sm text-text-secondary">
      <Input className="w-16 tabular-nums" {...naming} {...field.inputProps} />
      {field.weeks === 1 ? "week" : "weeks"}
    </span>
  );
}

export function WeeksFieldNotes({
  field,
  className,
}: {
  field: WeeksFieldState;
  className?: string;
}) {
  if (!field.hint) return null;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <p className="text-xs text-text-secondary" id={field.hint.id}>
        {field.hint.text}
      </p>
    </div>
  );
}
