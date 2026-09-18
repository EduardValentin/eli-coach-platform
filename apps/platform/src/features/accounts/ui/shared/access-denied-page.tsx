import { SectionEyebrow } from "@eli-coach-platform/ui/primitives";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router";

import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "~/features/accounts/contracts/paths";
import { STORE_PATH } from "~/features/store/contracts/paths";

export type AccessDeniedRecovery = "client-portal" | "coach-portal" | "store";

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
    to: CLIENT_PORTAL_PATH,
  },
  "coach-portal": {
    actionLabel: "Back to the coach portal",
    description:
      "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
    to: COACH_PORTAL_PATH,
  },
  store: {
    actionLabel: "Back to the Store",
    description:
      "This part of Evoa is for coaching clients and their coach. Your account doesn't have access to it.",
    to: STORE_PATH,
  },
};

type AccessDeniedPageProps = {
  recovery: AccessDeniedRecovery;
};

export function resolveAccessDeniedRecovery(
  data: unknown,
): AccessDeniedRecovery {
  const recovery = (data as { recovery?: unknown } | undefined)?.recovery;

  return recovery === "store" ||
    recovery === "client-portal" ||
    recovery === "coach-portal"
    ? recovery
    : "store";
}

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
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
        to={copy.to}
      >
        {copy.actionLabel}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </main>
  );
}
