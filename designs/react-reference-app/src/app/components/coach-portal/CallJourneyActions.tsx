import { useState } from 'react';
import { Send, UserPlus, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RowActionButton } from '../RowActionButton';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { ClientJourney, JourneyStage } from '../../domain/journey';
import {
  PAYMENT_LINK_ERROR_MESSAGES,
  sendPaymentLink,
} from '../../services/paymentLinkService';
import {
  INVITATION_VALIDITY_DAYS,
  InvitationError,
  sendInvitation,
  type SentInvitation,
} from '../../services/invitationService';

const REPLACED_NOTE = 'Her earlier invitation no longer works.';

const ALREADY_CLIENT_MESSAGE = 'This email already belongs to a client.';

const INVITATION_DELIVERY_FAILURE_MESSAGE =
  'Saved, but the email could not be sent. Try again in a moment.';

type JourneyAction = {
  icon: LucideIcon;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
};

function invitationSentMessage(invitation: SentInvitation): string {
  const sent = `Invitation sent to ${invitation.email}.`;

  return invitation.replaced ? `${sent} ${REPLACED_NOTE}` : sent;
}

function invitationFailureMessage(error: unknown): string {
  return error instanceof InvitationError && error.code === 'already-client'
    ? ALREADY_CLIENT_MESSAGE
    : INVITATION_DELIVERY_FAILURE_MESSAGE;
}

function journeyAction(
  stage: JourneyStage,
  name: string,
  email: string,
  sendLink: () => Promise<void>,
  invite: () => Promise<void>,
): JourneyAction | null {
  switch (stage) {
    case 'held':
      return {
        icon: Send,
        buttonLabel: 'Send payment link',
        title: 'Send payment link?',
        description: `${name} gets an email with a link to choose her bundle and pay.`,
        confirmLabel: 'Send link',
        run: sendLink,
      };
    case 'payment-link-sent':
      return {
        icon: Send,
        buttonLabel: 'Re-send payment link',
        title: 'Re-send payment link?',
        description: `A fresh link goes to ${email}. Her earlier link stops working.`,
        confirmLabel: 'Re-send link',
        run: sendLink,
      };
    case 'paid':
      return {
        icon: UserPlus,
        buttonLabel: 'Invite',
        title: 'Send invitation?',
        description: `${name} gets an email to create her account. The invitation is valid for ${INVITATION_VALIDITY_DAYS} days.`,
        confirmLabel: 'Send invitation',
        run: invite,
      };
    case 'invited':
      return {
        icon: UserPlus,
        buttonLabel: 'Re-send invitation',
        title: 'Re-send invitation?',
        description: `A fresh invitation goes to ${email}. Her earlier invitation no longer works.`,
        confirmLabel: 'Re-send invitation',
        run: invite,
      };
    default:
      return null;
  }
}

export function CallJourneyActions({ journey }: { journey: ClientJourney }) {
  const { appState } = useAppState();
  const { recordPaymentLinkSent, recordInvitation } = useClientJourneys();
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name =
    `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
  const email = journey.identity.email;

  const sendLink = async () => {
    setSending(true);

    try {
      const link = await sendPaymentLink(appState.paymentLinkOutcome);
      recordPaymentLinkSent(journey.callId, link);
      toast.success(`Payment link sent to ${email}.`);
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

  const action = journeyAction(journey.stage, name, email, sendLink, invite);

  if (!action) return null;

  const confirm = () => {
    setConfirmOpen(false);
    void action.run();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
      <RowActionButton
        icon={action.icon}
        busy={sending}
        onClick={() => setConfirmOpen(true)}
        className="w-full md:w-auto"
      >
        {action.buttonLabel}
      </RowActionButton>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={action.title}
        description={action.description}
        confirmLabel={action.confirmLabel}
        onConfirm={confirm}
      />
    </div>
  );
}
