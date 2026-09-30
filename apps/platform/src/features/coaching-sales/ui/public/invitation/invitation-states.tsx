import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { ArrowRight, MailQuestion, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import {
  useHandOffToHostedSignUp,
  useInvitationResolution,
  useInvitationToken,
} from "./invitation-resolution";

export function SignedInInvitation(props: { children: ReactNode }) {
  useInvitationToken();

  return (
    <DeadEndPage
      description="This invitation creates a new account. Sign out first, then open the link again."
      eyebrow="Invitation"
      icon={<UserRound aria-hidden="true" size={36} />}
      landmarkLabel="Error"
      title="You're already signed in"
    >
      {props.children}
    </DeadEndPage>
  );
}

export function AnonymousInvitation() {
  const token = useInvitationToken();
  const invitation = useInvitationResolution(token);
  useHandOffToHostedSignUp(invitation);

  if (invitation.state === "unavailable") {
    return <UnavailableInvitation />;
  }

  return (
    <main
      aria-label="Invitation"
      className="flex min-h-screen items-center justify-center bg-surface-page px-6"
    >
      <p
        aria-busy="true"
        className="text-base text-text-secondary"
        role="status"
      >
        Checking your invitation…
      </p>
    </main>
  );
}

function UnavailableInvitation() {
  return (
    <DeadEndPage
      description="It may have expired or already been used. Ask your coach for a new one."
      eyebrow="Invitation"
      icon={<MailQuestion aria-hidden="true" size={36} />}
      landmarkLabel="Error"
      title="This invitation isn't available"
    >
      <Link
        className={buttonVariants({ size: "lg", variant: "inverted" })}
        to="/"
      >
        Back to home
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </DeadEndPage>
  );
}
