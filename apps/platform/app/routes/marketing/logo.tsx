import { Link } from "react-router";

import { cn } from "@eli-coach-platform/ui";

type EliFitnessLogoProps = {
  isSolid: boolean;
  onNavigate?: () => void;
};

export function EliFitnessLogo(props: EliFitnessLogoProps) {
  const { isSolid, onNavigate } = props;

  return (
    <Link
      className="relative z-[60] inline-flex min-w-0 items-center gap-2 rounded-xs outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
      onClick={onNavigate}
      to="/"
    >
      <svg
        aria-hidden="true"
        className={cn(
          "size-7 shrink-0 transition-colors duration-150 ease-out",
          isSolid && "text-brand-primary",
          !isSolid && "text-current",
        )}
        fill="none"
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          transform="rotate(45 14 14)"
          width="18"
          x="5"
          y="5"
        />
        <rect fill="currentColor" height="14" rx="1" width="14" x="7" y="7" />
      </svg>
      <span
        className={cn(
          "ml-2 truncate font-heading text-xl font-semibold tracking-nav transition-colors duration-150 ease-out",
          isSolid && "text-text-primary",
          !isSolid && "text-text-inverted",
        )}
      >
        Eli Fitness
      </span>
    </Link>
  );
}
