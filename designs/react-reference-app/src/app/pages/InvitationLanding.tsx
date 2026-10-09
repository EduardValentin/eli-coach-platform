import { useEffect, useState } from 'react';
import { MailQuestion, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ErrorPage, DeadEndLink } from '../components/ErrorPage';
import { Button } from '../components/ThemeButton';
import { isSignedIn, useAppState } from '../context/AppContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { useFragmentToken } from '../hooks/useFragmentToken';
import { completeSignIn } from '../services/authService';
import { resolveInvitation } from '../services/invitationService';

const UNAVAILABLE_TITLE = "This invitation isn't available";

const UNAVAILABLE_BODY =
  'It may have expired or already been used. Ask your coach for a new one.';

const SIGNED_IN_TITLE = "You're already signed in";

const SIGNED_IN_BODY =
  'This invitation creates a new account. Sign out first, then open the link again.';

const INVITATION_STORAGE_KEY = 'invitation';

type InvitationCheck = 'checking' | 'unavailable';

export function InvitationLanding() {
  const token = useFragmentToken(INVITATION_STORAGE_KEY);
  const navigate = useNavigate();
  const { appState, setAppState } = useAppState();
  const { demoJourney, journeyForInvitationToken, recordAccountCreated } =
    useClientJourneys();
  const [check, setCheck] = useState<InvitationCheck>('checking');

  const { invitationLinkState } = appState;
  const signedIn = isSignedIn(appState.session);

  useEffect(() => {
    if (signedIn || token === null) return;

    let current = true;
    const journey = journeyForInvitationToken(token) ?? demoJourney;

    const handOffToHostedSignUp = async () => {
      const role = await completeSignIn('client');
      if (!current) return;

      setAppState({ session: role });
      recordAccountCreated(journey.callId);
      navigate('/portal/welcome');
    };

    resolveInvitation(token, invitationLinkState).then((resolved) => {
      if (!current) return;

      if (resolved.status === 'valid') {
        void handOffToHostedSignUp();
        return;
      }

      setCheck('unavailable');
    });

    return () => {
      current = false;
    };
  }, [signedIn, token, invitationLinkState]);

  const signOut = () => {
    setCheck('checking');
    setAppState({ session: 'anonymous' });
  };

  if (signedIn) {
    return (
      <ErrorPage
        eyebrow="Invitation"
        icon={UserRound}
        title={SIGNED_IN_TITLE}
        description={SIGNED_IN_BODY}
      >
        <Button onClick={signOut} size="lg" variant="inverted">
          Sign out
        </Button>
      </ErrorPage>
    );
  }

  if (check === 'checking') {
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

  return (
    <ErrorPage
      eyebrow="Invitation"
      icon={MailQuestion}
      title={UNAVAILABLE_TITLE}
      description={UNAVAILABLE_BODY}
    >
      <DeadEndLink direction="back" to="/">
        Back to home
      </DeadEndLink>
    </ErrorPage>
  );
}
