import { SectionEyebrow } from "@eli-coach-platform/ui";
import { KeyRound, RotateCcw } from "lucide-react";
import { Link, type MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Sign-in failed | Eli Coach Platform" },
  {
    name: "description",
    content: "We could not finish signing you in. Please try again.",
  },
];

/**
 * Reached only when the session was already invalidated, so there is nothing to
 * recover and nothing to offer but another attempt.
 */
export default function SignInFailedRoute() {
  return (
    <section
      aria-labelledby="sign-in-failed-heading"
      className="mx-auto flex max-w-lg flex-col items-center py-16 text-center"
    >
      <span className="mb-6 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <KeyRound aria-hidden="true" size={36} />
      </span>
      <SectionEyebrow variant="muted">Sign-in failed</SectionEyebrow>
      <h1
        className="font-heading text-display-md tracking-tight text-text-primary"
        id="sign-in-failed-heading"
      >
        We couldn&rsquo;t finish signing you in
      </h1>
      <p className="mt-4 text-body-lg text-text-secondary">
        Your account couldn&rsquo;t be set up, so we signed you out again. Nothing
        was lost &mdash; give it another go.
      </p>
      <Link
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
        to="/auth/sign-in"
      >
        Try Again
        <RotateCcw aria-hidden="true" size={18} />
      </Link>
    </section>
  );
}
