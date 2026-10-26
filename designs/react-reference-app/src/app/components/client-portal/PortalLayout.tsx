import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { PORTAL_MAIN_ID, PortalSidebar } from './PortalSidebar';
import { CLIENT_PORTAL_LINKS } from './navigation-links';
import { DEMO_CLIENT, useCheckins } from '../../context/CheckinContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { useUnopenedResources } from '../../hooks/useClientResources';

const RESOURCES_HREF = '/portal/resources';
const CHECKINS_HREF = '/portal/checkins';

export function PortalLayout() {
  const { demoJourney } = useClientJourneys();
  const hasUnopenedResources = useUnopenedResources(demoJourney.callId);
  const { getCheckinsAwaiting } = useCheckins();
  const checkinsAwaiting = getCheckinsAwaiting('client', DEMO_CLIENT.id).length;

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

      <PortalSidebar
        links={CLIENT_PORTAL_LINKS}
        markedHrefs={hasUnopenedResources ? [RESOURCES_HREF] : []}
        countByHref={{ [CHECKINS_HREF]: checkinsAwaiting }}
      />

      <main
        id={PORTAL_MAIN_ID}
        tabIndex={-1}
        className="lg:pl-64 pt-[calc(env(safe-area-inset-top)+4rem)] lg:pt-0 [--portal-tab-bar-clearance:calc(env(safe-area-inset-bottom)+5rem)] pb-(--portal-tab-bar-clearance) lg:pb-0 focus:outline-none"
      >
        <div className="max-w-portal mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
