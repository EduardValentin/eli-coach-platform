import { Link } from "react-router";

import { cn } from "~/shared/design-system/lib";
import { BrandMark } from "~/shared/design-system/primitives";

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
      <BrandMark appearance={appearance} />
      <span
        className={cn(
          "ml-2 font-heading text-xl font-semibold tracking-wide transition-colors",
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
