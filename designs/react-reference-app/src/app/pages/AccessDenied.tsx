import { Lock } from 'lucide-react';
import { ErrorPage, DeadEndLink } from '../components/ErrorPage';
import { useAppState, type PrototypeSession } from '../context/AppContext';

type Recovery = {
  description: string;
  actionLabel: string;
  actionHref: string;
};

// The guards send a signed-out visitor through sign-in rather than here, but
// the Dev Toggle link and a typed URL both reach this page while anonymous, so
// that case gets copy that does not assume an account.
const RECOVERY_BY_SESSION: Record<PrototypeSession, Recovery> = {
  anonymous: {
    description:
      "You're not signed in, so this page isn't available. Sign in from the Store to pick up where you left off.",
    actionLabel: 'Back to the Store',
    actionHref: '/store',
  },
  client: {
    description:
      "This is the coach's side of Evoa. Your plan, check-ins and messages are in your portal.",
    actionLabel: 'Back to your portal',
    actionHref: '/portal',
  },
  coach: {
    description:
      'This is the client portal. Your clients, plans and check-ins are in the coach portal.',
    actionLabel: 'Back to the coach portal',
    actionHref: '/coach',
  },
};

export function AccessDenied() {
  const { appState } = useAppState();
  const recovery = RECOVERY_BY_SESSION[appState.session];

  return (
    <ErrorPage
      icon={Lock}
      eyebrow="Error 403"
      title="You don't have access to this page"
      description={recovery.description}
      landmarkLabel="Access denied"
    >
      <DeadEndLink direction="back" to={recovery.actionHref}>
        {recovery.actionLabel}
      </DeadEndLink>
    </ErrorPage>
  );
}
