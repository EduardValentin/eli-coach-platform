import { SignInButton } from "@clerk/react-router";
import { Button, SectionEyebrow } from "@eli-coach-platform/ui";
import { KeyRound } from "lucide-react";
import { useLoaderData, type MetaFunction } from "react-router";

import { loader } from "./sign-in-failed-page.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix, and
// its loader lives in the sibling `sign-in-failed-page.server.ts`. The rule,
// and why merging them breaks the build: ARCHITECTURE.md, under "The `.server`
// suffix".
export { loader };

export const meta: MetaFunction = () => [
  { title: "Sign-in failed | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Your account couldn't be set up, so we signed you out again. Give it another go.",
  },
];

// Mirrors RootErrorPage's dead-end composition (icon, eyebrow, heading, body,
// call to action), but nested inside the public-site layout instead of
// replacing it — this route is a normal navigation target, not a boundary.
export default function SignInFailedRoute() {
  const { storePath } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <span className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <KeyRound aria-hidden="true" size={36} />
      </span>
      <SectionEyebrow variant="muted">Sign-in failed</SectionEyebrow>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        {"We couldn't finish signing you in"}
      </h1>
      <p className="mt-4 max-w-md text-body-lg text-text-secondary">
        {
          "Your account couldn't be set up, so we signed you out again. Nothing was lost — give it another go."
        }
      </p>
      <SignInButton
        fallbackRedirectUrl={storePath}
        signUpFallbackRedirectUrl={storePath}
      >
        <Button className="mt-8" size="lg" variant="primary">
          Try Again
        </Button>
      </SignInButton>
    </div>
  );
}
