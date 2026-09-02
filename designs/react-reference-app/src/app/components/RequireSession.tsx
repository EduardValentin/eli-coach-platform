import { Navigate, Outlet } from 'react-router';
import { isSignedIn, useAppState, type PrototypeSession } from '../context/AppContext';

type AuthenticatedSession = Exclude<PrototypeSession, 'anonymous'>;

// The one place the two denials are told apart: a signed-out visitor belongs in
// authentication, an authenticated one without access belongs on the 403. It
// lives on the route rather than in each layout because three copies of this
// rule drifted apart once already. `any` guards surfaces every account may
// enter, such as the Library, so it can only produce the sign-in denial.
export function RequireSession({
  session,
}: {
  session: AuthenticatedSession | 'any';
}) {
  const { appState } = useAppState();

  if (!isSignedIn(appState.session)) {
    return <Navigate to="/" replace />;
  }

  if (session !== 'any' && appState.session !== session) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
