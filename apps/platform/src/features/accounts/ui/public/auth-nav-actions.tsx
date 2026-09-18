import { SignInButton, SignOutButton } from "@clerk/react-router";
import type { AccountRole } from "@eli-coach-platform/domain/account";
import { cn } from "@eli-coach-platform/ui/lib";
import type { ReactNode } from "react";
import { Link } from "react-router";

import type { PublicSessionState } from "~/features/accounts/contracts/account";
import { PORTAL_PATH_BY_ROLE } from "~/features/accounts/contracts/paths";

type AuthNavActionsPlacement = "header" | "mobile-menu";

type PortalDestination = {
  href: string;
  label: string;
};

const PORTAL_DESTINATION_BY_ROLE: Record<AccountRole, PortalDestination> = {
  CLIENT: { href: PORTAL_PATH_BY_ROLE.CLIENT, label: "Client Portal" },
  COACH: { href: PORTAL_PATH_BY_ROLE.COACH, label: "Coach Portal" },
};

export type AuthNavActionsProps = {
  children?: ReactNode;
  placement?: AuthNavActionsPlacement;
  session: PublicSessionState;
  storePath: string;
};

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
      <AuthControl
        placement={placement}
        session={session}
        storePath={storePath}
      />
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
      className={cn(
        "hidden rounded-control border border-text-inverted/30 bg-text-inverted/15 px-4 py-1.5 text-sm font-medium tracking-nav text-text-inverted backdrop-blur-sm transition-colors duration-150 ease-out hover:bg-text-inverted/25 md:inline-flex",
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

  const className = cn("font-medium transition-colors duration-150 ease-out", {
    "hidden text-sm tracking-nav text-current hover:text-brand-primary md:inline-block":
      placement === "header",
    "text-2xl tracking-wide text-link-muted hover:text-text-primary":
      placement === "mobile-menu",
  });

  if (session.kind === "anonymous") {
    return (
      <SignInButton fallbackRedirectUrl={storePath}>
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
