import { cn } from "../lib/cn";

export type DateTimeParts = {
  date: string;
  time: string;
};

type DateTimeLabelSize = "sm" | "md";

const DATE_CLASS: Record<DateTimeLabelSize, string> = {
  sm: "text-sm font-medium text-text-primary",
  md: "text-base font-medium text-text-primary",
};

type DateTimeLabelProps = {
  className?: string;
  size?: DateTimeLabelSize;
  when: DateTimeParts;
};

export function DateTimeLabel({
  className,
  size = "md",
  when,
}: DateTimeLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-1.5",
        className,
      )}
    >
      <span className={DATE_CLASS[size]}>{when.date}</span>
      <span className="text-sm text-text-secondary">· {when.time}</span>
    </span>
  );
}
