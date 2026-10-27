import { cn } from "~/shared/design-system/lib";
import { Link } from "~/shared/design-system/primitives";

type LegalNavProps = {
  className?: string;
};

export function LegalNav(props: LegalNavProps) {
  return (
    <nav
      aria-label="Legal"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm",
        props.className,
      )}
    >
      <Link reloadDocument to="/privacy" variant="subtle">
        Privacy Policy
      </Link>
      <Link reloadDocument to="/terms" variant="subtle">
        Terms &amp; Conditions
      </Link>
    </nav>
  );
}
