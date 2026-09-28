import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  buttonVariants,
  cardVariants,
  Input,
  Label,
  SectionEyebrow,
} from "@eli-coach-platform/ui/primitives";
import { ArrowRight, MailQuestion, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import {
  useInvitationResolution,
  useInvitationToken,
} from "./invitation-resolution";

const INVITED_EMAIL_FIELD_ID = "invited-email";

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

  if (invitation.state === "checking") {
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

  if (invitation.state === "unavailable") {
    return <UnavailableInvitation />;
  }

  return (
    <InvitationCard
      continueUrl={invitation.continueUrl}
      email={invitation.email}
    />
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

function InvitationCard(props: { continueUrl: string; email: string }) {
  return (
    <main
      aria-label="Invitation"
      className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-16 sm:px-6"
      data-parity-root="InvitationLanding"
    >
      <div
        className={cn(
          cardVariants({ variant: "panel" }),
          "mx-auto w-full max-w-md px-6 py-10 sm:px-10",
        )}
      >
        <SectionEyebrow>Your invitation</SectionEyebrow>
        <h1 className="font-heading text-display-sm text-text-primary">
          Create your account
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Your email is already confirmed by this invitation — there's no code
          to type. You'll create your account on Evoa's secure sign-up page and
          land straight in your account.
        </p>
        <div className="mt-8">
          <Label className="text-text-label" htmlFor={INVITED_EMAIL_FIELD_ID}>
            Email
          </Label>
          <Input
            className="mt-2"
            data-parity="invited-email"
            id={INVITED_EMAIL_FIELD_ID}
            readOnly
            type="email"
            value={props.email}
          />
          <p className="mt-2 text-sm text-text-secondary">
            Your account uses this email
          </p>
        </div>
        <a
          className={buttonVariants({ className: "mt-8", width: "full" })}
          data-parity="continue"
          href={props.continueUrl}
        >
          Continue to create my account
        </a>
      </div>
    </main>
  );
}
