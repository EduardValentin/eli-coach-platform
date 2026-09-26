import { useState } from 'react';
import { Send, UserRound, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RowActionButton, RowActionLink } from '../RowActionButton';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import {
  isBeforeStage,
  type ClientJourney,
  type JourneyStage,
} from '../../domain/journey';
import { clientDetailPathForJourney } from '../../utils/journeyLabels';
import {
  PAYMENT_LINK_ERROR_MESSAGES,
  sendPaymentLink,
} from '../../services/paymentLinkService';

type JourneyAction = {
  icon: LucideIcon;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
};

function journeyAction(
  stage: JourneyStage,
  name: string,
  email: string,
  sendLink: () => Promise<void>,
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
    default:
      return null;
  }
}

export function CallJourneyActions({ journey }: { journey: ClientJourney }) {
  const { appState } = useAppState();
  const { recordPaymentLinkSent } = useClientJourneys();
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

  if (!isBeforeStage(journey.stage, 'invited')) {
    return (
      <RowActionLink
        to={clientDetailPathForJourney(journey)}
        icon={UserRound}
        className="w-full md:w-auto"
      >
        View client
      </RowActionLink>
    );
  }

  const action = journeyAction(journey.stage, name, email, sendLink);

  if (!action) return null;

  const confirm = () => {
    setConfirmOpen(false);
    void action.run();
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 w-full md:w-auto"
      data-parity-root="CallJourneyActions"
    >
      <RowActionButton
        icon={action.icon}
        busy={sending}
        data-parity="payment-link-action"
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
