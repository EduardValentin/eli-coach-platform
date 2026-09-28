import { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  invitationStanding,
  type InvitationStanding,
} from '../../domain/invitation';
import type { ClientJourney, JourneyInvitation } from '../../domain/journey';
import {
  INVITATION_RESEND_FAILURE_MESSAGE,
  resendInvitation,
} from '../../services/invitationService';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { PortalWidget } from '../PortalWidget';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { cn } from '../ui/utils';

function standingLine(
  standing: InvitationStanding,
  invitation: JourneyInvitation,
): string {
  switch (standing) {
    case 'email-failed':
      return 'Invitation email could not be sent';
    case 'expired':
      return `Invitation expired ${formatJourneyDate(invitation.expiresAt)}`;
    case 'pending':
      return `Invited ${formatJourneyDate(invitation.sentAt)} · expires ${formatJourneyDate(invitation.expiresAt)}`;
  }
}

export function InvitationBlock({
  journey,
  invitation,
}: {
  journey: ClientJourney;
  invitation: JourneyInvitation;
}) {
  const { appState } = useAppState();
  const { recordInvitationResent, recordInvitationEmailFailed } =
    useClientJourneys();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const email = journey.identity.email;
  const standing = invitationStanding(invitation, new Date());

  const resend = async () => {
    setConfirmOpen(false);
    setSending(true);

    try {
      const fresh = await resendInvitation(
        email,
        appState.invitationResendOutcome,
      );
      recordInvitationResent(journey.callId, fresh);
      toast.success(`Invitation sent to ${email}.`);
    } catch {
      recordInvitationEmailFailed(journey.callId);
      toast.error(INVITATION_RESEND_FAILURE_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  return (
    <PortalWidget
      presentation="coach"
      title="Invitation"
      icon={
        <Mail aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId="invitation-panel-heading"
      parityRoot="InvitationBlock"
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={sending}
          aria-busy={sending || undefined}
          data-parity="resend-invitation"
          onClick={() => setConfirmOpen(true)}
        >
          {sending ? (
            <Loader2 aria-hidden="true" size={16} className="animate-spin" />
          ) : (
            <Send aria-hidden="true" size={16} />
          )}
          Re-send invitation
        </Button>
      }
      className="mb-8"
    >
      <p
        className={cn(
          'text-sm',
          standing === 'email-failed'
            ? 'text-destructive'
            : 'text-text-secondary',
        )}
        data-parity="invitation-state"
      >
        {standingLine(standing, invitation)}
      </p>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Re-send invitation?"
        description={`A fresh invitation goes to ${email}. Her earlier link stops working.`}
        confirmLabel="Re-send"
        onConfirm={() => void resend()}
      />
    </PortalWidget>
  );
}
