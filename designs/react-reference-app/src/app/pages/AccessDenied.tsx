import { Link } from 'react-router';
import { ArrowRight, Lock } from 'lucide-react';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';
import { useAppState, type PrototypeSession } from '../context/AppContext';

type Recovery = {
  description: string;
  actionLabel: string;
  actionHref: string;
};

const BACK_TO_STORE: Recovery = {
  description:
    "This part of Evoa is for coaching clients and their coach. Your account doesn't have access to it.",
  actionLabel: 'Back to the Store',
  actionHref: '/store',
};

// A signed-out visitor is sent through sign-in rather than here, so the
// anonymous entry only covers someone opening /403 directly.
const RECOVERY_BY_SESSION: Record<PrototypeSession, Recovery> = {
  anonymous: BACK_TO_STORE,
  user: BACK_TO_STORE,
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
    >
      <Link to={recovery.actionHref} className={ERROR_PAGE_ACTION_CLASS}>
        {recovery.actionLabel} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </ErrorPage>
  );
}
