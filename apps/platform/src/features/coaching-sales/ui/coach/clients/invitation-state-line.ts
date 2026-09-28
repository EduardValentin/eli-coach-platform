import type { ClientInvitationReading } from "~/features/coaching-sales/contracts/coach-clients";
import { formatDayMonth } from "~/features/coaching-sales/ui/shared/calendar-day-format";

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
