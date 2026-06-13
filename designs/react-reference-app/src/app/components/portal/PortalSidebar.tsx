import { Link, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  Calendar,
  Utensils,
  PlaySquare,
  User,
  MessageSquare,
  History,
  Droplet,
  UserCircle,
  Menu,
  LogOut,
  ChevronRight,
  Settings,
  CalendarCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { NotificationBell } from '../NotificationBell';
import { BottomSheet } from '../ui/bottom-sheet';
import { NextCheckinCard } from './NextCheckinCard';

type NavLink = {
  name: string;
  href: string;
  icon: typeof Activity;
};

const PRIMARY_LINKS: NavLink[] = [
  { name: 'Dashboard', href: '/portal', icon: Activity },
  { name: 'My Plan', href: '/portal/plan', icon: Calendar },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { name: 'Cycle', href: '/portal/cycle', icon: Droplet },
];

const SECONDARY_LINKS: NavLink[] = [
  { name: 'Check-ins', href: '/portal/checkins', icon: CalendarCheck },
  { name: 'History', href: '/portal/history', icon: History },
  { name: 'Nutrition', href: '#', icon: Utensils },
  { name: 'Resources', href: '#', icon: PlaySquare },
  { name: 'Profile', href: '/portal/profile', icon: UserCircle },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

const ALL_LINKS: NavLink[] = [...PRIMARY_LINKS, ...SECONDARY_LINKS];

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '#') return false;
  if (href === '/portal') return pathname === '/portal';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ProfileHeader({ onNavigate }: { onNavigate?: () => void }) {
  const { clientProfile } = useClientProfile();
  const displayName = clientProfile?.name ?? 'Client';

  return (
    <Link
      to="/portal/profile"
      onClick={onNavigate}
      className="flex items-center gap-3 min-w-0 rounded-xl hover:opacity-80 transition-opacity"
    >
      {clientProfile?.avatarUrl ? (
        <img
          src={clientProfile.avatarUrl}
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-100"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center shrink-0">
          <User size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-sm text-[#121212] truncate">{displayName}</p>
        <p className="text-xs text-neutral-500">Active Client</p>
      </div>
    </Link>
  );
}

function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside
      aria-label="Client portal"
      className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-neutral-100 z-40 flex-col"
    >
      <div className="p-6 mb-4 border-b border-neutral-50 flex items-center justify-between">
        <ProfileHeader />
        <NotificationBell align="left" />
      </div>

      <nav aria-label="Client portal primary" className="flex-1 px-4 space-y-1 overflow-y-auto">
        {ALL_LINKS.map(link => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          return (
            <Link
              key={link.name}
              to={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                isActive
                  ? 'bg-[#C81D6B]/5 text-[#C81D6B] font-medium'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#121212] font-medium'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mb-6">
        <NextCheckinCard />
      </div>
    </aside>
  );
}

function MobileTopBar({ onOpenMore, moreOpen }: { onOpenMore: () => void; moreOpen: boolean }) {
  const { clientProfile } = useClientProfile();
  const displayName = clientProfile?.name ?? 'Client';

  return (
    <div
      className="lg:hidden fixed top-0 left-0 right-0 bg-white text-[#121212] border-b border-neutral-100 z-40 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 flex items-center justify-between px-4">
        <Link
          to="/portal/profile"
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
        >
          {clientProfile?.avatarUrl ? (
            <img
              src={clientProfile.avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-neutral-100"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
          )}
          <span className="font-semibold text-sm truncate">{displayName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={onOpenMore}
            aria-label="Open menu"
            aria-expanded={moreOpen}
            aria-controls="portal-more-sheet"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileTabBar() {
  const location = useLocation();

  return (
    <nav
      aria-label="Client portal primary"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch h-16">
        {PRIMARY_LINKS.map(link => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          return (
            <li key={link.name} className="flex-1">
              <Link
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors ${
                  isActive
                    ? 'text-[#C81D6B]'
                    : 'text-neutral-500 hover:text-[#121212]'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                <span className="text-[11px] font-semibold">{link.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MoreSheetBody({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAppState } = useAppState();

  const handleSignOut = () => {
    setAppState({ isAuthenticated: false, role: 'visitor', hasBundle: false, needsOnboarding: false });
    onClose();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-neutral-100">
        <ProfileHeader onNavigate={onClose} />
      </div>

      <nav aria-label="Client portal more" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {SECONDARY_LINKS.map(link => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          const isPlaceholder = link.href === '#';

          if (isPlaceholder) {
            return (
              <button
                key={link.name}
                type="button"
                disabled
                className="w-full flex items-center gap-4 px-4 min-h-14 rounded-2xl text-neutral-400 cursor-not-allowed"
              >
                <Icon size={22} aria-hidden="true" />
                <span className="text-base font-medium flex-1 text-left">{link.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Soon</span>
              </button>
            );
          }

          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={onClose}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-4 px-4 min-h-14 rounded-2xl transition-colors ${
                isActive
                  ? 'bg-[#C81D6B]/5 text-[#C81D6B]'
                  : 'text-[#121212] hover:bg-neutral-50'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
              <span className="text-base font-medium flex-1">{link.name}</span>
              <ChevronRight size={18} className="text-neutral-300" aria-hidden="true" />
            </Link>
          );
        })}

        <div className="pt-4">
          <NextCheckinCard />
        </div>
      </nav>

      <div
        className="border-t border-neutral-100 px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 min-h-12 px-4 rounded-2xl text-sm font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-[#121212] transition-colors"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function PortalSidebar() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <DesktopSidebar />
      <MobileTopBar onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
      <MobileTabBar />

      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="Portal menu"
        className="h-[90vh] flex flex-col"
      >
        <MoreSheetBody onClose={() => setMoreOpen(false)} />
      </BottomSheet>
    </>
  );
}
