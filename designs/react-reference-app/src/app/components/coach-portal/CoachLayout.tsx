import { Outlet } from 'react-router';
import { CoachSidebar } from './CoachSidebar';

export function CoachLayout() {
  return (
    <div className="flex min-h-screen bg-surface-page">
      <CoachSidebar />
      <main className="flex-1 min-w-0 lg:pl-64 pt-16 lg:pt-0">
        <div className="max-w-portal mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}