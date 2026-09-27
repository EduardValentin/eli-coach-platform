import { buildRedirectPath } from "@eli-coach-platform/config";
import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Button,
  buttonVariants,
  cardVariants,
  Input,
  Label,
  SectionEyebrow,
} from "@eli-coach-platform/ui/primitives";
import { ArrowRight, MailQuestion, UserRound } from "lucide-react";
import {
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import { SignOutControl } from "~/features/accounts/ui/shared/sign-out-control";
import { INVITATION_PATH } from "~/features/coaching-sales/contracts/paths";

import {
  useInvitationResolution,
  useInvitationToken,
} from "./invitation-resolution";

export type InvitationLoaderData = {
  invitationPath: string;
  signedIn: boolean;
};

const INVITED_EMAIL_FIELD_ID = "invited-email";

export function loader({ context }: LoaderFunctionArgs): InvitationLoaderData {
  const { appBasePath } = context.get(accountsContext).portal;

  return {
    invitationPath: buildRedirectPath(appBasePath, INVITATION_PATH),
    signedIn: context.get(sessionContext).kind === "authenticated",
  };
}

export const meta: MetaFunction = () => [
  { title: "Your invitation | Evoa" },
  { name: "robots", content: "noindex" },
];

export default function InvitationRoute() {
  const { invitationPath, signedIn } = useLoaderData<typeof loader>();
  const token = useInvitationToken();

  if (signedIn) {
    return <SignedInInvitation invitationPath={invitationPath} />;
  }

  return <AnonymousInvitation token={token} />;
}

function SignedInInvitation(props: { invitationPath: string }) {
  return (
    <DeadEndPage
      description="This invitation creates a new account. Sign out first, then open the link again."
      eyebrow="Invitation"
      icon={<UserRound aria-hidden="true" size={36} />}
      landmarkLabel="Error"
      title="You're already signed in"
    >
      <SignOutControl redirectUrl={props.invitationPath}>
        <Button size="lg" variant="inverted">
          Sign out
        </Button>
      </SignOutControl>
    </DeadEndPage>
  );
}

function AnonymousInvitation(props: { token: string | null }) {
  const invitation = useInvitationResolution(props.token);

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
