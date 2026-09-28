import { cn } from "@eli-coach-platform/ui/lib";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { Loader2, Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import {
  invitationStateLine,
  resendInvitationSuccessSchema,
  type ClientInvitationReading,
} from "~/features/coaching-sales/contracts/coach-clients";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";
import { useCalendarDayTimeZone } from "~/features/coaching-sales/ui/shared/calendar-day-format";

const RESEND_FAILURE_MESSAGE =
  "The invitation email could not be sent. Try again.";

type InvitationBlockProps = {
  clientId: string;
  email: string;
  invitation: ClientInvitationReading;
};

export function InvitationBlock({
  clientId,
  email,
  invitation,
}: InvitationBlockProps) {
  const [confirming, setConfirming] = useState(false);
  const { isSending, resend } = useInvitationResender(clientId);
  const timeZone = useCalendarDayTimeZone();

  const confirm = () => {
    setConfirming(false);
    resend();
  };

  return (
    <div data-parity-root="InvitationBlock">
      <PortalWidget
        action={
          <Button
            aria-busy={isSending || undefined}
            data-parity="resend-invitation"
            disabled={isSending}
            onClick={() => setConfirming(true)}
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
          confirmLabel="Re-send"
          description={`A fresh invitation goes to ${email}. Her earlier link stops working.`}
          onConfirm={confirm}
          onOpenChange={setConfirming}
          open={confirming}
          title="Re-send invitation?"
        />
      </PortalWidget>
    </div>
  );
}

function useInvitationResender(clientId: string) {
  const fetcher = useFetcher<unknown>();
  const { revalidate } = useRevalidator();
  const { data, state, submit } = fetcher;
  const isSending = state !== "idle";

  useEffect(() => {
    if (data === undefined) {
      return;
    }

    const sent = resendInvitationSuccessSchema.safeParse(data);

    if (sent.success) {
      toast.success(`Invitation sent to ${sent.data.email}.`);
      return;
    }

    toast.error(RESEND_FAILURE_MESSAGE);
    void revalidate();
  }, [data, revalidate]);

  const resend = () => {
    void submit(
      { clientId },
      {
        action: COACHING_SALES_API_PATHS.invitationResends,
        encType: "application/json",
        method: "post",
      },
    );
  };

  return { isSending, resend };
}
