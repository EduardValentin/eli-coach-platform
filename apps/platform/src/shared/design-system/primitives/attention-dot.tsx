import { cn } from "../lib/cn";

type AttentionDotProps = {
  className?: string;
};

export function AttentionDot(props: AttentionDotProps) {
  const { className } = props;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-2 shrink-0 rounded-full bg-status-pending",
        className,
      )}
      data-parity="attention-dot"
    />
  );
}
