import { useId, useState } from "react";

import { cn } from "~/shared/design-system/lib";
import { InlineProblem, Input } from "~/shared/design-system/primitives";

import { COUNT_PROBLEM, parseCount } from "./row-fields";

type RowTextFieldProps<Value> = {
  label: string;
  value: Value;
  format: (value: Value) => string;
  parse: (text: string) => Value | null;
  problem: string;
  onCommit: (value: Value) => void;
  suffix?: string;
  type?: "number" | "text";
  className?: string;
};

export function RowTextField<Value>({
  label,
  value,
  format,
  parse,
  problem,
  onCommit,
  suffix,
  type = "text",
  className,
}: RowTextFieldProps<Value>) {
  const formatted = format(value);
  const [text, setText] = useState(formatted);
  const [shown, setShown] = useState(formatted);
  const [invalid, setInvalid] = useState(false);
  const problemId = useId();
  const suffixId = useId();
  const describedBy = [suffix ? suffixId : "", invalid ? problemId : ""]
    .filter((id) => id !== "")
    .join(" ");
  if (formatted !== shown) {
    setShown(formatted);
    setText(formatted);
    setInvalid(false);
  }

  function change(raw: string) {
    setText(raw);
    const parsed = parse(raw);
    if (parsed === null) return;
    setInvalid(false);
    setShown(format(parsed));
    onCommit(parsed);
  }

  function settle(raw: string) {
    const parsed = parse(raw);
    setInvalid(parsed === null);
    if (parsed !== null) setText(format(parsed));
  }

  return (
    <div className="grid gap-1">
      <span className="flex items-center gap-1">
        <Input
          aria-describedby={describedBy || undefined}
          aria-invalid={invalid ? true : undefined}
          aria-label={label}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn("tabular-nums", className)}
          inputMode={type === "number" ? "numeric" : undefined}
          min={type === "number" ? 1 : undefined}
          onBlur={() => settle(text)}
          onChange={(event) => change(event.target.value)}
          spellCheck={false}
          type={type}
          value={text}
        />
        {suffix && (
          <span
            className="min-w-8 text-xs whitespace-nowrap text-text-secondary"
            id={suffixId}
          >
            {suffix.trim()}
          </span>
        )}
      </span>
      {invalid && <InlineProblem id={problemId}>{problem}</InlineProblem>}
    </div>
  );
}

type CountFieldProps = Pick<
  RowTextFieldProps<number>,
  "label" | "value" | "onCommit" | "suffix" | "className"
>;

export function CountField(field: CountFieldProps) {
  return (
    <RowTextField
      format={String}
      parse={parseCount}
      problem={COUNT_PROBLEM}
      type="number"
      {...field}
    />
  );
}
