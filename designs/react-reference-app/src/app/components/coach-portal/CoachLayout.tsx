import { Outlet } from 'react-router';
import { SkipLink } from '../ui/skip-link';
import { CoachSidebar } from './CoachSidebar';
import { useCoachPortalScope } from './useCoachPortalScope';

const COACH_MAIN_ID = 'coach-main';

export function CoachLayout() {
  useCoachPortalScope();

  return (
    <div className="flex min-h-screen bg-surface-page">
      <SkipLink targetId={COACH_MAIN_ID} />
      <CoachSidebar />
      <main id={COACH_MAIN_ID} tabIndex={-1} className="flex-1 min-w-0 lg:pl-64 pt-16 lg:pt-0 focus:outline-none">
        <div className="max-w-portal mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
