import { Navigate, Outlet, useLocation } from 'react-router';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { deriveStatus } from '../../domain/coachingSubscription';
import { isBeforeStage, type ClientJourney } from '../../domain/journey';

export const WELCOME_PATH = '/portal/welcome';
export const ONBOARDING_PATH = '/portal/onboarding';
export const ENDED_PATH = '/portal/ended';
export const ANSWER_REQUEST_PARAM = 'answer';

const PORTAL_HOME = '/portal';

function hasEnded(journey: ClientJourney, now: Date): boolean {
  return journey.subscription
    ? deriveStatus(journey.subscription, now) === 'ended'
    : false;
}

export function ClientJourneyGate() {
  const { demoJourney } = useClientJourneys();
  const { pathname, search } = useLocation();

  if (hasEnded(demoJourney, new Date())) {
    return pathname === ENDED_PATH ? <Outlet /> : <Navigate replace to={ENDED_PATH} />;
  }

  if (pathname === ENDED_PATH) return <Navigate replace to={PORTAL_HOME} />;

  const isPreparingProgram = isBeforeStage(demoJourney.stage, 'submitted');
  const isOnboardingStep =
    pathname === WELCOME_PATH || pathname === ONBOARDING_PATH;

  if (isPreparingProgram) {
    if (isOnboardingStep) return <Outlet />;

    return (
      <Navigate
        replace
        to={demoJourney.welcomeSeen ? ONBOARDING_PATH : WELCOME_PATH}
      />
    );
  }

  const answersRequested =
    new URLSearchParams(search).get(ANSWER_REQUEST_PARAM) === '1';

  if (pathname === WELCOME_PATH) return <Navigate replace to={PORTAL_HOME} />;

  if (pathname === ONBOARDING_PATH && !answersRequested) {
    return <Navigate replace to={PORTAL_HOME} />;
  }

  return <Outlet />;
}
