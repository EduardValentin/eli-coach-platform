import { cn } from "@eli-coach-platform/ui/lib";
import { Link } from "@eli-coach-platform/ui/primitives";

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
