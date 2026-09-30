import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { LABEL_CLASS, VALUE_CLASS, VALUE_LG_CLASS } from "../lib/typography";

type ReadingSize = "default" | "lg";

const VALUE_CLASS_BY_SIZE: Record<ReadingSize, string> = {
  default: VALUE_CLASS,
  lg: cn(VALUE_LG_CLASS, "tabular-nums"),
};

type ReadingContent = {
  label: ReactNode;
  labelAdornment?: ReactNode;
  value: ReactNode;
  className?: string;
  as?: "dl-item" | "block";
  valueParity?: string;
};

type DefaultReading = ReadingContent & { size?: "default"; unit?: never };

type LargeReading = ReadingContent & { size: "lg"; unit?: string };

type ReadingProps = DefaultReading | LargeReading;

export function Reading({
  label,
  labelAdornment,
  value,
  size = "default",
  unit,
  className,
  as = "block",
  valueParity,
}: ReadingProps) {
  const LabelTag = as === "dl-item" ? "dt" : "p";
  const ValueTag = as === "dl-item" ? "dd" : "p";

  return (
    <div className={className}>
      <LabelTag
        className={cn(LABEL_CLASS, {
          "flex items-center gap-1": labelAdornment != null,
        })}
      >
        {label}
        {labelAdornment}
      </LabelTag>
      <ValueTag
        className={cn("mt-1", VALUE_CLASS_BY_SIZE[size])}
        data-parity={valueParity}
      >
        {value}
        {unit && (
          <span className="ml-1 text-sm font-medium tracking-normal text-text-secondary">
            {unit}
          </span>
        )}
      </ValueTag>
    </div>
  );
}
