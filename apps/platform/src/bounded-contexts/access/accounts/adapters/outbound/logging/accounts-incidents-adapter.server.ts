import type { AccountInvitationIncidentsPort } from "~/bounded-contexts/access/accounts/domain/account";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class AccountsIncidentsAdapter implements AccountInvitationIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  invitationEmailFailed({ invitationId }: { invitationId: string }) {
    this.logger.error("Client invitation email failed.", {
      errorCategory: "client_invitation_email_failure",
      invitationId,
    });
  }

  invitationResendFailed({
    invitationId,
    step,
  }: {
    invitationId: string;
    step: "provider" | "email";
  }) {
    this.logger.error("Client invitation re-send failed.", {
      errorCategory: "client_invitation_resend_failure",
      invitationId,
      step,
    });
  }

  invitationResent({ invitationId }: { invitationId: string }) {
    this.logger.info("Client invitation re-sent.", {
      eventCategory: "client_invitation_resent",
      invitationId,
    });
  }
}
