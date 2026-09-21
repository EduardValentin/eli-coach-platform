import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { ClientJourney, JourneyStage } from '../../domain/journey';
import {
  PAYMENT_LINK_ERROR_MESSAGES,
  sendPaymentLink,
} from '../../services/paymentLinkService';
import {
  InvitationError,
  sendInvitation,
  type SentInvitation,
} from '../../services/invitationService';

const REPLACED_NOTE = 'Her earlier invitation no longer works.';

const ALREADY_CLIENT_MESSAGE = 'This email already belongs to a client.';

const INVITATION_DELIVERY_FAILURE_MESSAGE =
  'Saved, but the email could not be sent. Try again in a moment.';

const PAYMENT_LINK_STAGES: readonly JourneyStage[] = [
  'held',
  'payment-link-sent',
];

function invitationSentMessage(invitation: SentInvitation): string {
  const sent = `Invitation sent to ${invitation.email}.`;

  return invitation.replaced ? `${sent} ${REPLACED_NOTE}` : sent;
}

function invitationFailureMessage(error: unknown): string {
  return error instanceof InvitationError && error.code === 'already-client'
    ? ALREADY_CLIENT_MESSAGE
    : INVITATION_DELIVERY_FAILURE_MESSAGE;
}

export function CallJourneyActions({
  journey,
  visitorName,
}: {
  journey: ClientJourney;
  visitorName: string;
}) {
  const { appState } = useAppState();
  const { recordPaymentLinkSent, recordInvitation } = useClientJourneys();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const offersPaymentLink = PAYMENT_LINK_STAGES.includes(journey.stage);
  const offersInvitation = journey.stage === 'paid';

  const sendLink = async () => {
    setSending(true);

    try {
      const link = await sendPaymentLink(appState.paymentLinkOutcome);
      recordPaymentLinkSent(journey.callId, link);
      toast.success(`Payment link sent to ${journey.identity.email}.`);
    } catch {
      toast.error(PAYMENT_LINK_ERROR_MESSAGES['delivery-failure']);
    } finally {
      setSending(false);
      setMenuOpen(false);
    }
  };

  const invite = async () => {
    setSending(true);

    try {
      const invitation = await sendInvitation(
        journey.identity,
        appState.invitationOutcome,
      );
      recordInvitation(journey.callId, invitation);
      toast.success(invitationSentMessage(invitation));
    } catch (error) {
      toast.error(invitationFailureMessage(error));
    } finally {
      setSending(false);
      setMenuOpen(false);
    }
  };

  if (!offersPaymentLink && !offersInvitation) return null;

  return (
    <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Journey actions for ${visitorName}`}
          aria-busy={sending}
          className="self-end md:self-auto"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {offersPaymentLink && (
          <DropdownMenuItem
            disabled={sending}
            onSelect={(event) => {
              event.preventDefault();
              void sendLink();
            }}
          >
            {sending ? 'Sending payment link…' : 'Send payment link'}
          </DropdownMenuItem>
        )}

        {offersInvitation && (
          <DropdownMenuItem
            disabled={sending}
            onSelect={(event) => {
              event.preventDefault();
              void invite();
            }}
          >
            {sending ? 'Sending invitation…' : 'Invite'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
