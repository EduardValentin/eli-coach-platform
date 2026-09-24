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
  MoreHorizontal,
  LogOut,
  ChevronRight,
  Settings,
  CalendarCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { useClientProfile, fullName } from '../../context/ClientProfileContext';
import { NotificationBell } from '../NotificationBell';
import { LABEL_CLASS } from '../typography';
import { BottomSheet } from '../ui/bottom-sheet';
import { Button } from '../ui/button';
import { NextCheckinCard } from './NextCheckinCard';

type NavLink = {
  name: string;
  href: string;
  icon: typeof Activity;
  postMvp?: boolean;
  tab?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { name: 'Dashboard', href: '/portal', icon: Activity, tab: true },
  {
    name: 'My Plan',
    href: '/portal/plan',
    icon: Calendar,
    postMvp: true,
    tab: true,
  },
  {
    name: 'Messages',
    href: '/portal/messages',
    icon: MessageSquare,
    postMvp: true,
    tab: true,
  },
  {
    name: 'Check-ins',
    href: '/portal/checkins',
    icon: CalendarCheck,
    tab: true,
  },
  { name: 'Profile', href: '/portal/profile', icon: UserCircle, tab: true },
  { name: 'Cycle', href: '/portal/cycle', icon: Droplet },
  { name: 'History', href: '/portal/history', icon: History, postMvp: true },
  {
    name: 'Nutrition',
    href: '/portal/nutrition',
    icon: Utensils,
    postMvp: true,
  },
  { name: 'Resources', href: '#', icon: PlaySquare },
  { name: 'Settings', href: '/portal/settings', icon: Settings },
];

const MAX_BAR_TABS = 4;

const TAB_CLASS: Record<'active' | 'idle', string> = {
  active: 'bg-primary-soft text-primary',
  idle: 'text-text-secondary hover:bg-accent hover:text-accent-foreground',
};

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '#') return false;
  if (href === '/portal') return pathname === '/portal';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ProfileHeader({ onNavigate }: { onNavigate?: () => void }) {
  const { clientProfile } = useClientProfile();
  const displayName = clientProfile ? fullName(clientProfile) : 'Client';

  return (
    <Link
      to="/portal/profile"
      onClick={onNavigate}
      className="flex items-center gap-3 min-w-0 rounded-control hover:opacity-80 transition-opacity"
    >
      {clientProfile?.avatarUrl ? (
        <img
          src={clientProfile.avatarUrl}
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-border-subtle"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <User size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {displayName}
        </p>
      </div>
    </Link>
  );
}

function DesktopSidebar({ links }: { links: NavLink[] }) {
  const location = useLocation();

  return (
    <aside
      aria-label="Client portal"
      className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-border-subtle z-40 flex-col"
    >
      <div className="p-6 mb-4 px-3 border-b border-border-subtle rounded-field flex items-center justify-between">
        <ProfileHeader />
        <NotificationBell align="left" />
      </div>

      <nav
        aria-label="Client portal primary"
        className="flex flex-1 flex-col gap-1 px-4 overflow-y-auto"
      >
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          return (
            <Link
              key={link.name}
              to={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-4 px-4 py-3 rounded-card transition-all ${
                isActive
                  ? 'bg-primary-soft text-primary font-medium'
                  : 'text-text-secondary hover:bg-accent hover:text-accent-foreground font-medium'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
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

function MobileTopBar() {
  const { clientProfile } = useClientProfile();
  const displayName = clientProfile ? fullName(clientProfile) : 'Client';

  return (
    <div
      className="lg:hidden fixed top-0 left-0 right-0 bg-white text-text-primary px-3 border-b border-border-subtle rounded-field z-40 shadow-sm"
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
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-border-subtle"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
          )}
          <span className="text-sm font-medium truncate">{displayName}</span>
        </Link>
        <NotificationBell />
      </div>
    </div>
  );
}

function MobileTabBar({
  links,
  moreLinks,
  moreOpen,
  onOpenMore,
}: {
  links: NavLink[];
  moreLinks: NavLink[];
  moreOpen: boolean;
  onOpenMore: () => void;
}) {
  const location = useLocation();
  const moreActive =
    moreOpen ||
    moreLinks.some((link) => isRouteActive(location.pathname, link.href));

  return (
    <nav
      aria-label="Client portal tabs"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-subtle z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          return (
            <li key={link.name} className="flex-1">
              <Link
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors ${
                  TAB_CLASS[isActive ? 'active' : 'idle']
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span className="text-caption font-semibold">{link.name}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            aria-expanded={moreOpen}
            aria-controls="portal-more-sheet"
            className={`flex flex-col items-center justify-center gap-1 h-full w-full transition-colors ${
              TAB_CLASS[moreActive ? 'active' : 'idle']
            }`}
          >
            <MoreHorizontal
              size={22}
              strokeWidth={moreActive ? 2.4 : 2}
              aria-hidden="true"
            />
            <span className="text-caption font-semibold">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

function MoreSheetBody({
  links,
  onClose,
}: {
  links: NavLink[];
  onClose: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAppState } = useAppState();

  const handleSignOut = () => {
    setAppState({ session: 'anonymous', hasBundle: false });
    onClose();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-border-subtle rounded-field">
        <ProfileHeader onNavigate={onClose} />
      </div>

      <nav
        aria-label="Client portal more"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
      >
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isRouteActive(location.pathname, link.href);
          const isPlaceholder = link.href === '#';

          if (isPlaceholder) {
            return (
              <button
                key={link.name}
                type="button"
                disabled
                className="w-full flex items-center gap-4 px-4 min-h-14 rounded-card text-text-secondary pointer-events-none opacity-50"
              >
                <Icon size={22} aria-hidden="true" />
                <span className="text-base font-medium flex-1 text-left">
                  {link.name}
                </span>
                <span className={LABEL_CLASS}>Soon</span>
              </button>
            );
          }

          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={onClose}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-4 px-4 min-h-14 rounded-card transition-colors ${
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'text-text-primary hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 2}
                aria-hidden="true"
              />
              <span className="text-base font-medium flex-1">{link.name}</span>
              <ChevronRight
                size={18}
                className="text-text-secondary"
                aria-hidden="true"
              />
            </Link>
          );
        })}

        <div className="pt-4">
          <NextCheckinCard />
        </div>
      </nav>

      <div
        className="border-t border-border-subtle px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Button
          type="button"
          onClick={handleSignOut}
          variant="ghost"
          className="w-full text-text-secondary hover:text-text-primary"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function PortalSidebar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { appState } = useAppState();
  const includeLink = (link: NavLink) =>
    !link.postMvp || appState.prototypeMode === 'post-mvp';
  const links = NAV_LINKS.filter(includeLink);
  const barLinks = links.filter((link) => link.tab).slice(0, MAX_BAR_TABS);
  const moreLinks = links.filter((link) => !barLinks.includes(link));

  return (
    <>
      <DesktopSidebar links={links} />
      <MobileTopBar />
      <MobileTabBar
        links={barLinks}
        moreLinks={moreLinks}
        moreOpen={moreOpen}
        onOpenMore={() => setMoreOpen(true)}
      />

      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="More"
        className="h-[90vh] flex flex-col"
      >
        <MoreSheetBody links={moreLinks} onClose={() => setMoreOpen(false)} />
      </BottomSheet>
    </>
  );
}
