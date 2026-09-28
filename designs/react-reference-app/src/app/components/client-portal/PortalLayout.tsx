import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { PORTAL_MAIN_ID, PortalSidebar } from './PortalSidebar';
import { CLIENT_PORTAL_LINKS } from './navigation-links';
import { ActiveWorkoutBanner } from './ActiveWorkoutBanner';
import { useAppState } from '../../context/AppContext';

export function PortalLayout() {
  const { appState } = useAppState();

  useEffect(() => {
    document.documentElement.dataset.portal = 'client';
    return () => {
      delete document.documentElement.dataset.portal;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-page">
      <a className="ui-skip-link" href={`#${PORTAL_MAIN_ID}`}>
        Skip to main content
      </a>

      <PortalSidebar links={CLIENT_PORTAL_LINKS} />

      <main
        id={PORTAL_MAIN_ID}
        tabIndex={-1}
        className="lg:pl-64 pt-[calc(env(safe-area-inset-top)+4rem)] lg:pt-0 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-0 focus:outline-none"
      >
        <div className="max-w-portal mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {appState.prototypeMode === 'post-mvp' && <ActiveWorkoutBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
