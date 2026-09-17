import { SignInButton } from "@clerk/react-router";
import { Button, SectionEyebrow } from "@eli-coach-platform/ui/primitives";
import { KeyRound } from "lucide-react";
import {
  useLoaderData,
  type MetaFunction,
  type LoaderFunctionArgs,
} from "react-router";
import { buildRedirectPath } from "@eli-coach-platform/config";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { STORE_PATH } from "~/features/store/contracts/paths";

export type SignInFailedLoaderData = {
  storePath: string;
};

export function loader(args: LoaderFunctionArgs): SignInFailedLoaderData {
  const { appBasePath } = args.context.get(accountsContext).portal;

  return {
    storePath: buildRedirectPath(appBasePath, STORE_PATH),
  };
}

export const meta: MetaFunction = () => [
  { title: "Sign-in failed | Evoa" },
  {
    name: "description",
    content:
      "Your account couldn't be set up, so we signed you out again. Give it another go.",
  },
];

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
      <SignInButton fallbackRedirectUrl={storePath}>
        <Button className="mt-8" size="lg" variant="primary">
          Try Again
        </Button>
      </SignInButton>
    </div>
  );
}
