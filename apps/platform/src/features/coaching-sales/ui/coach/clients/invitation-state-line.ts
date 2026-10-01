import { formatDayMonth } from "@eli-coach-platform/ui/lib";
import type { ClientInvitationReading } from "~/features/coaching-sales/contracts/coach-clients";

export function invitationStateLine(
  invitation: ClientInvitationReading,
  timeZone: string,
): string {
  switch (invitation.state) {
    case "email-failed":
      return "Invitation email could not be sent";
    case "expired":
      return `Invitation expired ${formatDayMonth(invitation.expiresAt, timeZone)}`;
    case "pending":
      return `Invited ${formatDayMonth(invitation.sentAt, timeZone)} · expires ${formatDayMonth(invitation.expiresAt, timeZone)}`;
  }
}
