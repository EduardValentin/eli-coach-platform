import { buildRedirectPath } from "@eli-coach-platform/config";
import { Button } from "@eli-coach-platform/ui/primitives";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import { SignOutControl } from "~/features/accounts/ui/shared/sign-out-control";
import { INVITATION_PATH } from "~/features/coaching-sales/contracts/paths";
import {
  AnonymousInvitation,
  SignedInInvitation,
} from "~/features/coaching-sales/ui/public/invitation/invitation-states";

export type InvitationLoaderData = {
  invitationPath: string;
  signedIn: boolean;
};

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

  if (signedIn) {
    return (
      <SignedInInvitation>
        <SignOutControl redirectUrl={invitationPath}>
          <Button size="lg" variant="inverted">
            Sign out
          </Button>
        </SignOutControl>
      </SignedInInvitation>
    );
  }

  return <AnonymousInvitation />;
}
