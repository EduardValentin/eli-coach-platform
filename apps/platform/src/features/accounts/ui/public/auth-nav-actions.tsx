import { SignInButton, SignOutButton } from "@clerk/react-router";
import type { AccountRole } from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

import type { PublicSessionState } from "~/features/accounts/contracts/account";

// "header" renders the compact controls that live in the always-visible nav
// bar (portal pill + wrapped children such as the cart, then the Sign
// In/Out text control); "mobile-menu" renders the larger, plain-text
// treatment the full-screen mobile overlay uses instead — see
// designs/react-reference-app/src/app/components/Navbar.tsx for the two
// treatments this mirrors. It intentionally does not reuse
// PublicNavigationVariant ("waitlist" | "normal"): whether these controls
// render at all is a waitlist decision the caller makes before reaching this
// component, not something AuthNavActions itself needs to know.
export type AuthNavActionsPlacement = "header" | "mobile-menu";

type PortalDestination = {
  href: string;
  label: string;
};

const PORTAL_DESTINATION_BY_ROLE: Partial<Record<AccountRole, PortalDestination>> = {
  CLIENT: { href: "/client", label: "Client Portal" },
  COACH: { href: "/coach", label: "Coach Portal" },
};

export type AuthNavActionsProps = {
  children?: ReactNode;
  placement?: AuthNavActionsPlacement;
  session: PublicSessionState;
  storePath: string;
};

// Renders the public nav's session-aware controls: a role's portal pill
// (CLIENT/COACH only), whatever the caller sandwiches in the middle (the
// cart button, in the header placement), and the Sign In/Out control last —
// this ordering mirrors the prototype nav. Never renders an account/profile
// menu; USER accounts get Sign Out and nothing else.
export function AuthNavActions(props: AuthNavActionsProps) {
  const { children, placement = "header", session, storePath } = props;
  const portalDestination =
    session.kind === "authenticated"
      ? PORTAL_DESTINATION_BY_ROLE[session.role]
      : undefined;

  return (
    <>
      {portalDestination ? (
        <PortalPillLink destination={portalDestination} placement={placement} />
      ) : null}
      {children}
      <AuthControl placement={placement} session={session} storePath={storePath} />
    </>
  );
}

function PortalPillLink(props: {
  destination: PortalDestination;
  placement: AuthNavActionsPlacement;
}) {
  const { destination, placement } = props;

  if (placement === "mobile-menu") {
    return (
      <Link
        className="text-2xl font-medium tracking-wide text-brand-primary transition-colors duration-150 ease-out hover:text-brand-primary-hover"
        to={destination.href}
      >
        {destination.label}
      </Link>
    );
  }

  return (
    <Link
      // The header placement's pill is desktop-only — its mobile counterpart
      // lives in the full-screen overlay instead (rendered separately, via
      // the "mobile-menu" placement) — so it stays out of the always-visible
      // header bar below `md`, the same way the nav links do.
      //
      // The translucent-over-hero look and the brand-filled look both live
      // here at once; which one paints is decided in CSS by the nearest
      // `data-appearance` ancestor (the nav `<header>`, marked `group`), the
      // same group-data mechanism public-site/sections/my-method.tsx already
      // uses for its own ancestor-driven state — not by threading scroll
      // state down as a prop. The translucent fill uses opacity on
      // `text-inverted` (always-white) rather than a raw `white/*` value, the
      // same "opacity modifier on a semantic token" pattern the header itself
      // already uses for `bg-surface-base/95` and `bg-surface-base/0`.
      className={cn(
        "hidden rounded-pill border border-text-inverted/30 bg-text-inverted/15 px-4 py-1.5 text-sm font-medium tracking-nav text-text-inverted backdrop-blur-sm transition-colors duration-150 ease-out hover:bg-text-inverted/25 md:inline-flex",
        "group-data-[appearance=solid]:border-transparent group-data-[appearance=solid]:bg-brand-primary group-data-[appearance=solid]:text-brand-primary-foreground group-data-[appearance=solid]:backdrop-blur-none group-data-[appearance=solid]:hover:bg-brand-primary-hover",
      )}
      to={destination.href}
    >
      {destination.label}
    </Link>
  );
}

function AuthControl(props: {
  placement: AuthNavActionsPlacement;
  session: PublicSessionState;
  storePath: string;
}) {
  const { placement, session, storePath } = props;
  // Same desktop-only rule as the portal pill: the header placement's
  // control is the compact text link that lives in the always-visible bar,
  // hidden below `md` in favor of the larger mobile-menu placement.
  const className = cn("font-medium transition-colors duration-150 ease-out", {
    "hidden text-sm tracking-nav text-current hover:text-brand-primary md:inline-block":
      placement === "header",
    "text-2xl tracking-wide text-link-muted hover:text-text-primary":
      placement === "mobile-menu",
  });

  if (session.kind === "anonymous") {
    return (
      <SignInButton fallbackRedirectUrl={storePath} signUpFallbackRedirectUrl={storePath}>
        <button className={className} type="button">
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <SignOutButton redirectUrl={storePath}>
      <button className={className} type="button">
        Sign Out
      </button>
    </SignOutButton>
  );
}
