import { cn } from "../lib/cn";

type BrandMarkProps = {
  appearance?: "solid" | "transparent";
};

export function BrandMark({ appearance = "solid" }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 rotate-45 items-center justify-center rounded-tile border-2 transition-colors",
        {
          "border-brand-primary": appearance === "solid",
          "border-current": appearance === "transparent",
        },
      )}
      data-parity="brand-mark"
    >
      <span
        className={cn("block size-3 -rotate-45 transition-colors", {
          "bg-brand-primary": appearance === "solid",
          "bg-current": appearance === "transparent",
        })}
      />
    </span>
  );
}
