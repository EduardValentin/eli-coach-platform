import { cn, useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { Loader2, Mail, Send } from "lucide-react";
import { useRevalidator } from "react-router";

import { possessivePronoun } from "~/features/assessment-calls/contracts/visitor-profile";
import {
  resendInvitationSuccessSchema,
  type ClientInvitationReading,
  type CoachClient,
} from "~/features/coaching-sales/contracts/coach-clients";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { useConfirmedJsonAction } from "~/features/coaching-sales/ui/coach/use-confirmed-json-action";

import { invitationStateLine } from "./invitation-state-line";

const RESEND_FAILURE_MESSAGE =
  "The invitation email could not be sent. Try again.";

type InvitedClient = Pick<
  CoachClient,
  "clientId" | "email" | "gender" | "subscriptionCancelledOrEnded"
>;

type InvitationBlockProps = {
  client: InvitedClient;
  invitation: ClientInvitationReading;
};

export function InvitationBlock({ client, invitation }: InvitationBlockProps) {
  const { clientId, email, gender } = client;
  const { revalidate } = useRevalidator();
  const { askToConfirm, confirmDialog, isSending } = useConfirmedJsonAction({
    action: COACHING_SALES_API_PATHS.invitationResends,
    body: { clientId },
    failureMessage: () => RESEND_FAILURE_MESSAGE,
    onFailure: () => void revalidate(),
    sentMessage: (sent) => `Invitation sent to ${sent.email}.`,
    sentSchema: resendInvitationSuccessSchema,
  });
  const timeZone = useCalendarDayTimeZone();

  return (
    <PortalWidget
      data-parity-root="InvitationBlock"
      action={
        client.subscriptionCancelledOrEnded ? null : (
          <Button
            aria-busy={isSending || undefined}
            data-parity="resend-invitation"
            disabled={isSending}
            onClick={askToConfirm}
            size="sm"
            variant="outline"
          >
            {isSending ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Send aria-hidden="true" size={16} />
            )}
            Re-send invitation
          </Button>
        )
      }
      className="mb-8"
      headingId="invitation-panel-heading"
      icon={
        <Mail aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      title="Invitation"
    >
      <p
        className={cn("text-sm", {
          "text-feedback-danger": invitation.state === "email-failed",
          "text-text-secondary": invitation.state !== "email-failed",
        })}
        data-parity="invitation-state"
      >
        {invitationStateLine(invitation, timeZone)}
      </p>

      <ConfirmDialog
        {...confirmDialog}
        confirmLabel="Re-send"
        description={`A fresh invitation goes to ${email}. ${possessivePronoun(gender).capitalised} earlier link stops working.`}
        title="Re-send invitation?"
      />
    </PortalWidget>
  );
}
