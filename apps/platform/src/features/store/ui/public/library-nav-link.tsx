import { cn } from "@eli-coach-platform/ui";
import { Link } from "react-router";

// "header" is the compact link in the always-visible bar, hidden below `md` in
// favour of "mobile-menu", the larger text the full-screen overlay shows — the
// two placements the public nav gives every session-aware control. The classes
// follow the prototype's own Library link (designs/react-reference-app/src/app/
// components/Navbar.tsx), which is why the overlay treatment is not identical
// to the Sign Out control beside it. The placement union is declared here
// rather than imported from the accounts feature, which this one may not reach
// into.
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
