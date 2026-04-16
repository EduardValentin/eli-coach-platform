import { Outlet, Navigate } from 'react-router';
import { PortalSidebar } from './PortalSidebar';
import { useAppState } from '../../context/AppContext';

export function PortalLayout() {
  const { appState } = useAppState();

  // If not authenticated or not a client, redirect them back home or to login
  if (!appState.isAuthenticated || appState.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  if (appState.needsOnboarding) {
    return <Navigate to="/portal/onboarding" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <PortalSidebar />
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}