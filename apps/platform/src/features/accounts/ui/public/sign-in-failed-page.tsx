import { SignInButton } from "@clerk/react-router";
import {
  DEAD_END_ACTION_CLASS_NAME,
  DeadEndPage,
} from "@eli-coach-platform/ui/layout";
import { KeyRound, RotateCcw } from "lucide-react";
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
    <DeadEndPage
      description="Your account couldn't be set up, so we signed you out again. Nothing was lost — give it another go."
      eyebrow="Sign-in failed"
      icon={<KeyRound aria-hidden="true" size={36} />}
      label="Error"
      title="We couldn't finish signing you in"
    >
      <SignInButton fallbackRedirectUrl={storePath}>
        <button className={DEAD_END_ACTION_CLASS_NAME} type="button">
          Try Again
          <RotateCcw aria-hidden="true" size={18} />
        </button>
      </SignInButton>
    </DeadEndPage>
  );
}
