import { useEffect } from "react";
import { useFetcher } from "react-router";

import {
  invitationResolutionRequestSchema,
  invitationResolutionSchema,
  type InvitationResolution,
} from "~/features/coaching-sales/contracts/invitation";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { useFragmentToken } from "~/features/coaching-sales/ui/public/fragment-token";

const INVITATION_STORAGE_KEY = "coaching-sales:invitation";

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
        action: COACHING_SALES_API_PATHS.invitation,
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

function isResolvable(token: string | null): boolean {
  return invitationResolutionRequestSchema.safeParse({ token }).success;
}
