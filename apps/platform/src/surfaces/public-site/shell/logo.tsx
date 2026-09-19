import { Link } from "react-router";

import { cn } from "@eli-coach-platform/ui/lib";

import type { PublicHeaderAppearance } from "./header-appearance";

type LogoProps = {
  appearance: PublicHeaderAppearance;
  onNavigate?: () => void;
};

export function Logo(props: LogoProps) {
  const { appearance, onNavigate } = props;

  return (
    <Link
      className="relative z-[60] inline-flex min-w-0 items-center gap-2 rounded-tile outline-none"
      onClick={onNavigate}
      to="/"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 rotate-45 items-center justify-center rounded-tile border-2 transition-colors",
          {
            "border-brand-primary": appearance === "solid",
            "border-current": appearance === "transparent",
          },
        )}
      >
        <span
          className={cn("block size-3 -rotate-45 transition-colors", {
            "bg-brand-primary": appearance === "solid",
            "bg-current": appearance === "transparent",
          })}
        />
      </span>
      <span
        className={cn(
          "ml-2 font-heading text-xl font-semibold tracking-nav transition-colors",
          {
            "text-text-primary": appearance === "solid",
            "text-text-inverted": appearance === "transparent",
          },
        )}
      >
        Evoa
      </span>
    </Link>
  );
}
