import { useFragmentToken } from "~/shared/design-system/lib";
import { useEffect } from "react";
import { useFetcher } from "react-router";

import {
  invitationResolutionRequestSchema,
  invitationResolutionSchema,
  type InvitationResolution,
} from "~/bounded-contexts/access/accounts/public/invitation";
import { INVITATION_RESOLUTION_API_PATH } from "~/bounded-contexts/access/public/paths";

const INVITATION_STORAGE_KEY = "clients:invitation";

type InvitationView = InvitationResolution | { state: "checking" };

const CHECKING: InvitationView = { state: "checking" };
const UNAVAILABLE: InvitationView = { state: "unavailable" };

export function useInvitationToken(): string | null {
  return useFragmentToken(INVITATION_STORAGE_KEY);
}

export function useInvitationResolution(token: string | null): InvitationView {
  const { data, submit } = useFetcher<unknown>();
  const resolvable = isResolvable(token);

  useEffect(() => {
    if (!resolvable) {
      return;
    }

    void submit(
      { token },
      {
        action: INVITATION_RESOLUTION_API_PATH,
        encType: "application/json",
        method: "post",
      },
    );
  }, [resolvable, submit, token]);

  if (token === null) {
    return CHECKING;
  }

  if (!resolvable) {
    return UNAVAILABLE;
  }

  return data === undefined ? CHECKING : invitationResolutionSchema.parse(data);
}

export function useHandOffToHostedSignUp(invitation: InvitationView) {
  const signUpUrl = invitation.state === "valid" ? invitation.signUpUrl : null;

  useEffect(() => {
    if (signUpUrl !== null) {
      window.location.replace(signUpUrl);
    }
  }, [signUpUrl]);
}

function isResolvable(token: string | null): boolean {
  return invitationResolutionRequestSchema.safeParse({ token }).success;
}
