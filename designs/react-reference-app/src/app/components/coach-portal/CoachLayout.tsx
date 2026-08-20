import { Outlet } from 'react-router';
import { CoachSidebar } from './CoachSidebar';

export function CoachLayout() {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <CoachSidebar />
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}