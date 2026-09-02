import { SectionEyebrow } from "@eli-coach-platform/ui";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router";

export type AccessDeniedRecovery =
  | "client-portal"
  | "coach-portal"
  | "store";

type AccessDeniedCopy = {
  actionLabel: string;
  description: string;
  to: string;
};

const COPY_BY_RECOVERY: Record<AccessDeniedRecovery, AccessDeniedCopy> = {
  "client-portal": {
    actionLabel: "Back to your portal",
    description:
      "This is the coach's side of Evoa. Your plan, check-ins and messages are in your portal.",
    to: "/client",
  },
  "coach-portal": {
    actionLabel: "Back to the coach portal",
    description:
      "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
    to: "/coach",
  },
  store: {
    actionLabel: "Back to the Store",
    description:
      "This part of Evoa is for coaching clients and their coach. Your account doesn't have access to it.",
    to: "/store",
  },
};

type AccessDeniedPageProps = {
  recovery: AccessDeniedRecovery;
};

/**
 * Reads the surface a denied account does own out of the 403 the portal guard
 * threw. A response carrying nothing recognizable falls back to the Store,
 * the one surface every account can reach.
 */
export function resolveAccessDeniedRecovery(
  data: unknown,
): AccessDeniedRecovery {
  const recovery = (data as { recovery?: unknown } | undefined)?.recovery;

  return recovery === "store" || recovery === "client-portal" || recovery === "coach-portal"
    ? recovery
    : "store";
}

// Renders wherever a 403 reaches root's ErrorBoundary — the guard itself
// decided which surface the denied account does own, this only maps that
// decision to the recovery copy and destination. A visitor with no session
// never arrives here: the guard redirects them to sign-in instead.
// Mirrors RootErrorPage's
// dead-end composition (icon, eyebrow, heading, body, single action) since
// an ErrorBoundary replaces the portal shell the same way root's replaces
// the whole route tree.
export function AccessDeniedPage({ recovery }: AccessDeniedPageProps) {
  const copy = COPY_BY_RECOVERY[recovery];

  return (
    <main
      aria-label="Access denied"
      className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-6 py-16 text-center"
    >
      <span className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <Lock aria-hidden="true" size={36} />
      </span>
      <SectionEyebrow variant="muted">Error 403</SectionEyebrow>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        {"You don't have access to this page"}
      </h1>
      <p className="mt-4 max-w-md text-body-lg text-text-secondary">
        {copy.description}
      </p>
      <Link
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
        to={copy.to}
      >
        {copy.actionLabel}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}
