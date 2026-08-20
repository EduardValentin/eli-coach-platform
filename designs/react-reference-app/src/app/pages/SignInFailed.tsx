import { useState } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, RotateCcw } from 'lucide-react';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';
import { cn } from '../components/ui/utils';
import { useAppState } from '../context/AppContext';
import { completeSignIn } from '../services/authService';

export function SignInFailed() {
  const { appState, setAppState } = useAppState();
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);

  const retrySignIn = async () => {
    setIsRetrying(true);
    try {
      const session = await completeSignIn(appState.signInOutcome);
      setAppState({ session });
      navigate('/store');
    } catch {
      // Provisioning failed again. The session was never established, so the
      // visitor stays anonymous and stays here.
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
      <button
        type="button"
        onClick={retrySignIn}
        disabled={isRetrying}
        className={cn(ERROR_PAGE_ACTION_CLASS, {
          'opacity-60 pointer-events-none': isRetrying,
        })}
      >
        {isRetrying ? 'Signing you in…' : 'Try Again'}
        <RotateCcw size={18} aria-hidden="true" />
      </button>
    </ErrorPage>
  );
}
