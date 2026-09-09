import { Navigate, Outlet } from 'react-router';
import { isSignedIn, useAppState, type PrototypeSession } from '../context/AppContext';

type AuthenticatedSession = Exclude<PrototypeSession, 'anonymous'>;

// The one place the two denials are told apart: a signed-out visitor belongs in
// authentication, an authenticated one without access belongs on the 403. It
// lives on the route rather than in each layout because three copies of this
// rule drifted apart once already.
export function RequireSession({ session }: { session: AuthenticatedSession }) {
  const { appState } = useAppState();

  if (!isSignedIn(appState.session)) {
    return <Navigate to="/" replace />;
  }

  if (appState.session !== session) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
