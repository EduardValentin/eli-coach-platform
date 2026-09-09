import { cn } from "@eli-coach-platform/ui";
import { Link } from "react-router";

export type LibraryNavLinkPlacement = "header" | "mobile-menu";

export function LibraryNavLink(props: { placement: LibraryNavLinkPlacement }) {
  return (
    <Link
      className={cn(
        "font-medium tracking-nav transition-colors hover:text-brand-primary",
        {
          "hidden text-sm text-current md:inline-block":
            props.placement === "header",
          "text-2xl text-text-primary": props.placement === "mobile-menu",
        },
      )}
      to="/library"
    >
      Library
    </Link>
  );
}
