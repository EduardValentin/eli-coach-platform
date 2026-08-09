import { Link } from "react-router";

import { cn } from "@eli-coach-platform/ui";

type LogoProps = {
  isSolid: boolean;
  onNavigate?: () => void;
};

export function Logo(props: LogoProps) {
  const { isSolid, onNavigate } = props;

  return (
    <Link
      className="relative z-[60] inline-flex min-w-0 items-center gap-2 rounded-xs outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
      onClick={onNavigate}
      to="/"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 rotate-45 items-center justify-center rounded-public-logo-mark border-2 transition-colors duration-150 ease-out",
          {
            "border-brand-primary": isSolid,
            "border-current": !isSolid,
          },
        )}
      >
        <span
          className={cn(
            "block size-3 -rotate-45 transition-colors duration-150 ease-out",
            {
              "bg-brand-primary": isSolid,
              "bg-current": !isSolid,
            },
          )}
        />
      </span>
      <span
        className={cn(
          "ml-2 truncate font-heading text-xl font-semibold tracking-nav transition-colors duration-150 ease-out",
          {
            "text-text-primary": isSolid,
            "text-text-inverted": !isSolid,
          },
        )}
      >
        Eli Fitness
      </span>
    </Link>
  );
}
