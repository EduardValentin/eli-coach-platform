import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
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
    <DeadEndPage
      description={copy.description}
      eyebrow="Error 403"
      icon={<Lock aria-hidden="true" size={36} />}
      landmarkLabel="Access denied"
      title="You don't have access to this page"
    >
      <Link
        className={cn(
          buttonVariants({ size: "lg", variant: "inverted" }),
          "mt-8 px-7",
        )}
        to={copy.to}
      >
        {copy.actionLabel}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </DeadEndPage>
  );
}
