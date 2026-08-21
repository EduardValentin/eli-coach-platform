import { Outlet, Navigate } from 'react-router';
import { PortalSidebar } from './PortalSidebar';
import { ActiveWorkoutBanner } from './ActiveWorkoutBanner';
import { useAppState } from '../../context/AppContext';

export function PortalLayout() {
  const { appState } = useAppState();

  if (appState.needsOnboarding) {
    return <Navigate to="/portal/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-text-primary focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand"
      >
        Skip to content
      </a>

      <PortalSidebar />

      <main
        id="portal-main"
        tabIndex={-1}
        className="lg:pl-64 pt-[calc(env(safe-area-inset-top)+3.5rem)] lg:pt-0 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-0 focus:outline-none"
      >
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-4 sm:px-6 sm:pt-6 md:pt-7 lg:px-8 lg:py-8">
          <ActiveWorkoutBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
