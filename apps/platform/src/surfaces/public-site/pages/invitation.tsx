import { buildRedirectPath } from "~/shared/http/base-path";
import { Button } from "~/shared/design-system/primitives";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import { SignOutControl } from "~/bounded-contexts/access/accounts/ui/shared/sign-out-control";
import { INVITATION_PATH } from "~/bounded-contexts/clients/clients/public/paths";
import {
  AnonymousInvitation,
  SignedInInvitation,
} from "~/bounded-contexts/clients/clients/ui/public/invitation/invitation-states";

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
