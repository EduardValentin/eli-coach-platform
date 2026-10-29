import type { AccountInvitationIncidents } from "~/bounded-contexts/access/accounts/domain/account";
import type { Logger } from "~/shared/logging/console-logger.server";

export function createAccountsIncidents(
  logger: Logger,
): AccountInvitationIncidents {
  return {
    invitationEmailFailed: ({ invitationId }) => {
      logger.error("Client invitation email failed.", {
        errorCategory: "client_invitation_email_failure",
        invitationId,
      });
    },
    invitationResendFailed: ({ invitationId, step }) => {
      logger.error("Client invitation re-send failed.", {
        errorCategory: "client_invitation_resend_failure",
        invitationId,
        step,
      });
    },
    invitationResent: ({ invitationId }) => {
      logger.info("Client invitation re-sent.", {
        eventCategory: "client_invitation_resent",
        invitationId,
      });
    },
  };
}
