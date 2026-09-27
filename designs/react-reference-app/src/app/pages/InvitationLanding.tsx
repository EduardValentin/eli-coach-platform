import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowRight, MailQuestion, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';
import { Button, buttonVariants, cn } from '../components/ThemeButton';
import { cardVariants } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SectionEyebrow } from '../components/SectionEyebrow';
import { isSignedIn, useAppState } from '../context/AppContext';
import { useClientJourneys } from '../context/ClientJourneyContext';
import { useFragmentToken } from '../hooks/useFragmentToken';
import { completeSignIn } from '../services/authService';
import {
  resolveInvitation,
  type ResolvedInvitation,
} from '../services/invitationService';

const UNAVAILABLE_TITLE = "This invitation isn't available";

const UNAVAILABLE_BODY =
  'It may have expired or already been used. Ask your coach for a new one.';

const HAND_OFF_NOTE =
  "Your email is already confirmed by this invitation — there's no code to type. You'll create your account on Evoa's secure sign-up page and land straight in your account.";

const SIGNED_IN_TITLE = "You're already signed in";

const SIGNED_IN_BODY =
  'This invitation creates a new account. Sign out first, then open the link again.';

const INVITATION_STORAGE_KEY = 'invitation';

const HOSTED_SIGN_UP_URL = 'https://accounts.evoa.fit/sign-up?__clerk_ticket=mock';

type InvitationResolution = ResolvedInvitation | { status: 'loading' };

export function InvitationLanding() {
  const token = useFragmentToken(INVITATION_STORAGE_KEY);
  const navigate = useNavigate();
  const { appState, setAppState } = useAppState();
  const { demoJourney, journeyForInvitationToken, recordAccountCreated } =
    useClientJourneys();
  const [invitation, setInvitation] = useState<InvitationResolution>({
    status: 'loading',
  });
  const [creating, setCreating] = useState(false);

  const { invitationLinkState } = appState;
  const signedIn = isSignedIn(appState.session);

  useEffect(() => {
    if (signedIn || token === null) return;

    let current = true;

    resolveInvitation(token, invitationLinkState).then((resolved) => {
      if (current) setInvitation(resolved);
    });

    return () => {
      current = false;
    };
  }, [signedIn, token, invitationLinkState]);

  const journey = journeyForInvitationToken(token ?? '') ?? demoJourney;

  const signOut = () => {
    setInvitation({ status: 'loading' });
    setAppState({ session: 'anonymous' });
  };

  const createAccount = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (creating) return;

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
      data-parity-root="InvitationLanding"
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
            data-parity="invited-email"
            id="invited-email"
            readOnly
            type="email"
            value={journey.identity.email}
          />
          <p className="mt-2 text-sm text-text-secondary">
            Your account uses this email
          </p>
        </div>

        <a
          aria-busy={creating}
          className={cn(buttonVariants({ width: 'full' }), 'mt-8')}
          data-parity="continue"
          href={HOSTED_SIGN_UP_URL}
          onClick={createAccount}
        >
          {creating ? 'Opening secure sign-in…' : 'Continue to create my account'}
        </a>
      </div>
    </main>
  );
}
