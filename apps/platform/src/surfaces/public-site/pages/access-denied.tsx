import { SectionEyebrow } from "@eli-coach-platform/ui";
import { ArrowRight, Lock } from "lucide-react";
import { Link, type MetaFunction } from "react-router";

import type {
  AccountRoleName,
  PublicSession,
} from "~/features/accounts/contracts/session";
import { useSessionQuery } from "~/features/accounts/ui/public/query";

type Recovery = {
  actionHref: string;
  actionLabel: string;
  description: string;
};

// The guards send a signed-out visitor through sign-in rather than here, but a
// typed URL still reaches this page while anonymous, so that case gets copy
// that does not assume an account.
const ANONYMOUS_RECOVERY: Recovery = {
  actionHref: "/store",
  actionLabel: "Back to the Store",
  description:
    "You're not signed in, so this page isn't available. Sign in to pick up where you left off.",
};

const RECOVERY_BY_ROLE: Record<AccountRoleName, Recovery> = {
  CLIENT: {
    actionHref: "/client",
    actionLabel: "Back to your portal",
    description:
      "This is the coach's side of the platform. Your plan, check-ins and messages are in your portal.",
  },
  COACH: {
    actionHref: "/coach",
    actionLabel: "Back to the coach portal",
    description:
      "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
  },
  USER: {
    actionHref: "/store",
    actionLabel: "Back to the Store",
    description:
      "This part of the platform is for coaching clients and their coach. Your account doesn't have access to it.",
  },
};

export const meta: MetaFunction = () => [
  { title: "Access denied | Eli Coach Platform" },
  {
    name: "description",
    content: "You do not have access to this page.",
  },
];

export default function AccessDeniedRoute() {
  const recovery = resolveRecovery(useSessionQuery({ enabled: true }).data);

  return (
    <section
      aria-labelledby="access-denied-heading"
      className="mx-auto flex max-w-lg flex-col items-center py-16 text-center"
    >
      <span className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <Lock aria-hidden="true" size={36} />
      </span>
      <SectionEyebrow variant="muted">Error 403</SectionEyebrow>
      <h1
        className="font-heading text-display-md tracking-tight text-text-primary"
        id="access-denied-heading"
      >
        You don&rsquo;t have access to this page
      </h1>
      {recovery ? (
        <>
          <p className="mt-4 text-body-lg text-text-secondary">
            {recovery.description}
          </p>
          <Link
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
            to={recovery.actionHref}
          >
            {recovery.actionLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </>
      ) : (
        // Reserves the rows the resolved copy will fill, and says nothing it
        // might have to take back — this page is reached mostly by a signed-in
        // visitor with the wrong role, whom "you are not signed in" would
        // simply misinform.
        <span aria-hidden="true" className="mt-4 inline-block min-h-32 w-full" />
      )}
    </section>
  );
}

function resolveRecovery(session: PublicSession | undefined): Recovery | null {
  if (!session) {
    return null;
  }

  return session.status === "authenticated"
    ? RECOVERY_BY_ROLE[session.role]
    : ANONYMOUS_RECOVERY;
}
