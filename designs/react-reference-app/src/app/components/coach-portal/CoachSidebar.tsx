import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  Menu,
  X,
  Dumbbell,
  MessageSquare,
  Activity,
  Utensils,
  Video,
} from 'lucide-react';
import { useState, type ReactNode, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { NotificationBell } from '../NotificationBell';
import { useCheckins } from '../../context/CheckinContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { NavigationDialog } from '../ui/navigation-dialog';

const LINKS = [
  { name: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { name: 'Training', href: '/coach/training', icon: Activity },
  { name: 'Nutrition', href: '/coach/nutrition', icon: Utensils },
  { name: 'Messages', href: '/coach/messages', icon: MessageSquare },
  { name: 'Clients', href: '/coach/clients', icon: Users },
  { name: 'Schedule', href: '/coach/checkins', icon: CalendarDays },
  { name: 'Assessment calls', href: '/coach/assessment-calls', icon: Video },
  { name: 'Settings', href: '/coach/settings', icon: Settings },
];

const COACH_IDENTITY_CLASS_NAME =
  'flex items-center gap-3 min-w-0 rounded-control hover:opacity-80 transition-opacity';

function CoachIdentityContent({ coachAvatarUrl }: { coachAvatarUrl?: string }) {
  return (
    <>
      {coachAvatarUrl ? (
        <img
          src={coachAvatarUrl}
          alt=""
          className="w-10 h-10 rounded-compact object-cover shrink-0 shadow-md border border-neutral-100"
        />
      ) : (
        <div className="w-10 h-10 rounded-compact bg-text-primary text-white flex items-center justify-center shrink-0 shadow-md">
          <Dumbbell size={20} className="transform -rotate-45" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-serif font-semibold text-lg text-text-primary">Evoa</p>
        <p className="text-[10px] uppercase tracking-widest text-brand font-bold">Coach Portal</p>
      </div>
    </>
  );
}

function CoachIdentityLink({ coachAvatarUrl }: { coachAvatarUrl?: string }) {
  return (
    <Link to="/coach/profile" className={COACH_IDENTITY_CLASS_NAME}>
      <CoachIdentityContent coachAvatarUrl={coachAvatarUrl} />
    </Link>
  );
}

function CoachIdentityMark({ coachAvatarUrl }: { coachAvatarUrl?: string }) {
  return (
    <div aria-hidden="true" className={COACH_IDENTITY_CLASS_NAME}>
      <CoachIdentityContent coachAvatarUrl={coachAvatarUrl} />
    </div>
  );
}

interface SidebarContentProps {
  actions?: ReactNode;
  brand: ReactNode;
  firstLinkRef?: RefObject<HTMLAnchorElement>;
  onNavigate?: () => void;
  pathname: string;
  pendingCheckins?: number;
}

const SidebarContent = ({
  actions,
  brand,
  firstLinkRef,
  onNavigate,
  pathname,
  pendingCheckins = 0,
}: SidebarContentProps) => (
  <div className="flex flex-col h-full bg-white text-text-primary border-r border-neutral-100">
    {/* Brand / Profile Area */}
    <div className="p-6 mb-4 px-3 border-b border-neutral-50 rounded-field flex items-center justify-between">
      {brand}
      {actions}
    </div>

    {/* Navigation */}
    <nav className="flex flex-1 flex-col gap-1 px-4 py-2 overflow-y-auto">
      {LINKS.map((link, linkIndex) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href || (link.href !== '/coach' && pathname.startsWith(link.href));

        return (
          <Link
            key={link.name}
            to={link.href}
            onClick={onNavigate}
            ref={linkIndex === 0 ? firstLinkRef : undefined}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-card transition-all ${
              isActive
                ? 'bg-text-primary text-white shadow-md'
                : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-sm font-semibold">{link.name}</span>
            {link.name === 'Schedule' && pendingCheckins > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-status-pending text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCheckins}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  </div>
);

export function CoachSidebar() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { getPendingCheckins } = useCheckins();
  const { coachProfile } = useCoachProfile();
  const pendingCount = getPendingCheckins().length;
  const coachAvatarUrl = coachProfile.avatarUrl;
  const [isTopBarNotificationsOpen, setIsTopBarNotificationsOpen] = useState(false);

  return (
    <>
      <NavigationDialog
        closeMenuIcon={<X size={24} />}
        contentClassName="lg:hidden fixed inset-0 z-40 outline-none"
        menuButtonClassName="p-2 -mr-2 text-text-secondary hover:text-text-primary"
        openMenuIcon={<Menu size={24} />}
        renderTopBar={(topBar) => (
          <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white text-text-primary border-b border-neutral-100 rounded-field flex items-center justify-between px-6 z-50 shadow-sm">
            <Link
              to="/coach/profile"
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              {coachAvatarUrl ? (
                <img
                  src={coachAvatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-compact object-cover shrink-0 border border-neutral-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-compact bg-text-primary text-white flex items-center justify-center shrink-0">
                  <Dumbbell size={16} className="transform -rotate-45" />
                </div>
              )}
              <span className="font-serif font-semibold text-sm">Coach Portal</span>
            </Link>
            <div className="flex items-center gap-4">
              {topBar.actions}
              {topBar.menuButton}
            </div>
          </div>
        )}
        title="Coach portal mobile navigation"
        topBarActions={
          <NotificationBell
            onOpenChange={setIsTopBarNotificationsOpen}
            open={isTopBarNotificationsOpen}
          />
        }
      >
        {(menu) => (
          <>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-text-primary/20 backdrop-blur-sm"
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
              variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            />
            <motion.div
              className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl"
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', damping: 25, stiffness: 200 }
              }
              variants={{ closed: { x: '-100%' }, open: { x: 0 } }}
            >
              <SidebarContent
                brand={<CoachIdentityMark coachAvatarUrl={coachAvatarUrl} />}
                firstLinkRef={menu.firstLinkRef}
                onNavigate={menu.close}
                pathname={location.pathname}
                pendingCheckins={pendingCount}
              />
            </motion.div>
          </>
        )}
      </NavigationDialog>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 bg-white z-50">
        <SidebarContent
          actions={<NotificationBell align="left" />}
          brand={<CoachIdentityLink coachAvatarUrl={coachAvatarUrl} />}
          pathname={location.pathname}
          pendingCheckins={pendingCount}
        />
      </div>
    </>
  );
}
