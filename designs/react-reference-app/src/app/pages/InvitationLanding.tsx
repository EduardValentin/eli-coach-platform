import { useEffect, useState } from 'react';
import { ArrowRight, MailQuestion } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';
import { Button, cn } from '../components/ThemeButton';
import { cardVariants } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SectionEyebrow } from '../components/SectionEyebrow';
import { useAppState } from '../context/AppContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { completeSignIn } from '../services/authService';
import {
  resolveInvitation,
  type ResolvedInvitation,
} from '../services/invitationService';

const UNAVAILABLE_TITLE = "This invitation isn't available";

const UNAVAILABLE_BODY =
  'It may have expired or already been used. Ask your coach for a new one.';

const HAND_OFF_NOTE =
  "You'll set a password with Evoa's secure sign-in and come straight back here.";

type InvitationResolution = ResolvedInvitation | { status: 'loading' };

export function InvitationLanding() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { appState, setAppState } = useAppState();
  const { demoJourney, journeyForInvitationToken, recordAccountCreated } =
    useClientJourneys();
  const [invitation, setInvitation] = useState<InvitationResolution>({
    status: 'loading',
  });
  const [creating, setCreating] = useState(false);

  const { invitationLinkState } = appState;

  useEffect(() => {
    let current = true;

    resolveInvitation(token, invitationLinkState).then((resolved) => {
      if (current) setInvitation(resolved);
    });

    return () => {
      current = false;
    };
  }, [token, invitationLinkState]);

  const journey = journeyForInvitationToken(token) ?? demoJourney;

  const createAccount = async () => {
    setCreating(true);

    try {
      const role = await completeSignIn('client');
      setAppState({ session: role });
      recordAccountCreated(journey.callId);
      navigate('/portal/welcome');
    } catch {
      setCreating(false);
    }
  };

  if (invitation.status === 'loading') {
    return (
      <main
        aria-label="Invitation"
        className="flex min-h-screen items-center justify-center bg-surface-page px-6"
      >
        <p aria-busy="true" className="text-base text-text-secondary" role="status">
          Checking your invitation…
        </p>
      </main>
    );
  }

  if (invitation.status !== 'valid') {
    return (
      <ErrorPage
        eyebrow="Invitation"
        icon={MailQuestion}
        title={UNAVAILABLE_TITLE}
        description={UNAVAILABLE_BODY}
      >
        <Link className={ERROR_PAGE_ACTION_CLASS} to="/">
          Back to home <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </ErrorPage>
    );
  }

  return (
    <main
      aria-label="Invitation"
      className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-16 sm:px-6"
    >
      <div className={cn(cardVariants({ variant: 'panel' }), 'mx-auto w-full max-w-md px-6 py-10 sm:px-10')}>
        <SectionEyebrow>Your invitation</SectionEyebrow>

        <h1 className="font-serif text-display-sm text-text-primary">
          Create your account
        </h1>

        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          {HAND_OFF_NOTE}
        </p>

        <div className="mt-8">
          <Label className="text-text-label" htmlFor="invited-email">
            Email
          </Label>
          <Input
            className="mt-2"
            id="invited-email"
            readOnly
            type="email"
            value={journey.identity.email}
          />
          <p className="mt-2 text-sm text-text-secondary">
            Your account uses this email
          </p>
        </div>

        <Button
          aria-busy={creating}
          className="mt-8"
          disabled={creating}
          onClick={createAccount}
          width="full"
        >
          {creating ? 'Opening secure sign-in…' : 'Continue to create my account'}
        </Button>
      </div>
    </main>
  );
}
