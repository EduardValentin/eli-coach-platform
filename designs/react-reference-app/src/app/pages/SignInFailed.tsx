import { useState } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, RotateCcw } from 'lucide-react';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';
import { useAppState } from '../context/AppContext';
import { completeSignIn } from '../services/authService';
import { cn } from '../components/ui/utils';

const RETRY_FAILED_MESSAGE =
  "That didn't work either — we still couldn't set up your account. You can keep trying.";

export function SignInFailed() {
  const { appState, setAppState } = useAppState();
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasRetryFailed, setHasRetryFailed] = useState(false);

  const retrySignIn = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setHasRetryFailed(false);
    try {
      const session = await completeSignIn(appState.signInOutcome);
      setAppState({ session });
      navigate('/store');
    } catch {
      // Provisioning failed again. The session was never established, so the
      // visitor stays anonymous and stays here.
      setHasRetryFailed(true);
      setIsRetrying(false);
    }
  };

  return (
    <ErrorPage
      icon={KeyRound}
      eyebrow="Sign-in failed"
      title="We couldn't finish signing you in"
      description="Your account couldn't be set up, so we signed you out again. Nothing was lost — give it another go."
    >
      {hasRetryFailed && (
        <p role="alert" className="mt-6 text-sm leading-snug text-destructive">
          {RETRY_FAILED_MESSAGE}
        </p>
      )}
      {/* Kept focusable while busy: a disabled control drops keyboard focus to
          the body, stranding whoever just pressed it. */}
      <button
        type="button"
        onClick={retrySignIn}
        aria-busy={isRetrying}
        className={cn(ERROR_PAGE_ACTION_CLASS, 'aria-busy:opacity-60')}
      >
        {isRetrying ? 'Signing you in…' : 'Try Again'}
        <RotateCcw size={18} aria-hidden="true" />
      </button>
    </ErrorPage>
  );
}
