import { useState } from 'react';
import { Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { RowActionButton } from '../RowActionButton';
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

export function CallJourneyActions({ journey }: { journey: ClientJourney }) {
  const { appState } = useAppState();
  const { recordPaymentLinkSent, recordInvitation } = useClientJourneys();
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
    }
  };

  if (!offersPaymentLink && !offersInvitation) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
      {offersPaymentLink && (
        <RowActionButton
          icon={Send}
          busy={sending}
          onClick={() => void sendLink()}
          className="w-full md:w-auto"
        >
          Send payment link
        </RowActionButton>
      )}

      {offersInvitation && (
        <RowActionButton
          icon={UserPlus}
          busy={sending}
          onClick={() => void invite()}
          className="w-full md:w-auto"
        >
          Invite
        </RowActionButton>
      )}
    </div>
  );
}
