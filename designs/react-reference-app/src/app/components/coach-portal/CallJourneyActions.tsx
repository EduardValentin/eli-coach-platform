import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { isBeforeStage, type ClientJourney } from '../../domain/journey';
import {
  PAYMENT_LINK_ERROR_MESSAGES,
  sendPaymentLink,
} from '../../services/paymentLinkService';
import { InviteClientDialog } from './InviteClientDialog';

const INVITE_HINT = 'Available once she has paid.';

export function CallJourneyActions({
  journey,
  visitorName,
}: {
  journey: ClientJourney;
  visitorName: string;
}) {
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { recordPaymentLinkSent, recordInvitation, updateIdentity } =
    useClientJourneys();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const accountCreated = !isBeforeStage(journey.stage, 'account-created');
  const canInvite = !isBeforeStage(journey.stage, 'paid');

  const sendLink = async () => {
    setSendingLink(true);

    try {
      const link = await sendPaymentLink(appState.paymentLinkOutcome);
      recordPaymentLinkSent(journey.callId, link);
      toast.success(`Payment link sent to ${journey.identity.email}.`);
    } catch {
      toast.error(PAYMENT_LINK_ERROR_MESSAGES['delivery-failure']);
    } finally {
      setSendingLink(false);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Journey actions for ${visitorName}`}
            aria-busy={sendingLink}
            className="self-end md:self-auto"
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          {!accountCreated && (
            <>
              <DropdownMenuItem
                disabled={sendingLink}
                onSelect={(event) => {
                  event.preventDefault();
                  void sendLink();
                }}
              >
                {sendingLink ? 'Sending payment link…' : 'Send payment link'}
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={!canInvite}
                onSelect={() => setInviteOpen(true)}
                className="flex-col items-start gap-0.5"
              >
                <span>Invite</span>
                {!canInvite && (
                  <span className="text-xs text-muted-foreground">
                    {INVITE_HINT}
                  </span>
                )}
              </DropdownMenuItem>

              {(journey.paymentLink || journey.invitation) && (
                <DropdownMenuSeparator />
              )}
            </>
          )}

          {journey.paymentLink && (
            <DropdownMenuItem
              onSelect={() =>
                navigate(`/select-bundle?token=${journey.paymentLink?.token}`)
              }
            >
              Open payment link
            </DropdownMenuItem>
          )}

          {journey.invitation && (
            <DropdownMenuItem
              onSelect={() =>
                navigate(`/invitation/${journey.invitation?.token}`)
              }
            >
              Open invitation link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteClientDialog
        journey={journey}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={({ invitation, identity }) => {
          updateIdentity(journey.callId, identity);
          recordInvitation(journey.callId, invitation);
        }}
      />
    </>
  );
}
