import { DeadEndLink, DeadEndPage } from "~/shared/design-system/layout";
import { Lock } from "lucide-react";

import {
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "~/bounded-contexts/access/accounts/public/paths";

export type AccessDeniedRecovery = "client-portal" | "coach-portal" | "store";

type AccessDeniedCopy = {
  actionLabel: string;
  description: string;
};

const COPY_BY_RECOVERY: Record<AccessDeniedRecovery, AccessDeniedCopy> = {
  "client-portal": {
    actionLabel: "Back to your portal",
    description:
      "This is the coach's side of Evoa. Your plan, check-ins and messages are in your portal.",
  },
  "coach-portal": {
    actionLabel: "Back to the coach portal",
    description:
      "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
  },
  store: {
    actionLabel: "Back to the Store",
    description:
      "This part of Evoa is for coaching clients and their coach. Your account doesn't have access to it.",
  },
};

const PORTAL_PATH_BY_RECOVERY: Record<
  Exclude<AccessDeniedRecovery, "store">,
  string
> = {
  "client-portal": CLIENT_PORTAL_PATH,
  "coach-portal": COACH_PORTAL_PATH,
};

type AccessDeniedPageProps = {
  continuePath: string;
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

export function AccessDeniedPage({
  continuePath,
  recovery,
}: AccessDeniedPageProps) {
  const copy = COPY_BY_RECOVERY[recovery];
  const destination =
    recovery === "store" ? continuePath : PORTAL_PATH_BY_RECOVERY[recovery];

  return (
    <DeadEndPage
      description={copy.description}
      eyebrow="Error 403"
      icon={<Lock aria-hidden="true" size={36} />}
      landmarkLabel="Access denied"
      title="You don't have access to this page"
    >
      <DeadEndLink direction="back" to={destination}>
        {copy.actionLabel}
      </DeadEndLink>
    </DeadEndPage>
  );
}
