import type { ClientInvitationIncidents } from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type { ClientRosterIncidents } from "~/bounded-contexts/clients/clients/domain/client-roster";
import type { Logger } from "~/shared/logging/console-logger.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export function createClientsIncidents(
  logger: Logger,
): ClientInvitationIncidents & ClientRosterIncidents {
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
    rosterReadFailed: (error) => {
      logger.error("Client roster could not be read.", {
        errorCategory: "client_roster_read_failure",
        errorClass: errorClassOf(error),
      });
    },
  };
}
