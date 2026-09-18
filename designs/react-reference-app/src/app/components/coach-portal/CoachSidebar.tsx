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
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { NotificationBell } from '../NotificationBell';
import { useCheckins } from '../../context/CheckinContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import {
  NavigationDialog,
  NavigationDialogClose,
  NavigationDialogContent,
  NavigationDialogOverlay,
  NavigationDialogPortal,
  NavigationDialogTitle,
  NavigationDialogTrigger,
} from '../ui/navigation-dialog';
import { useCloseMobileNavigationOnDesktop } from '../ui/use-close-mobile-navigation-on-desktop';

type MobileMenuState = 'closed' | 'closing' | 'open';

const LINKS = [
  { name: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { name: 'Training', href: '/coach/training', icon: Activity },
  { name: 'Nutrition', href: '/coach/nutrition', icon: Utensils },
  { name: 'Messages', href: '/coach/messages', icon: MessageSquare },
  { name: 'Clients', href: '/coach/clients', icon: Users },
  { name: 'Schedule', href: '/coach/checkins', icon: CalendarDays },
  { name: 'Settings', href: '/coach/settings', icon: Settings },
];

interface SidebarContentProps {
  headerMode: 'interactive' | 'presentation';
  onNavigate: () => void;
  pathname: string;
  pendingCheckins?: number;
  coachAvatarUrl?: string;
}

function CoachIdentity(props: {
  coachAvatarUrl?: string;
  mode: 'interactive' | 'presentation';
  onNavigate: () => void;
}) {
  const { coachAvatarUrl, mode, onNavigate } = props;
  const className =
    'flex items-center gap-3 min-w-0 rounded-xl hover:opacity-80 transition-opacity';
  const content = (
    <>
      {coachAvatarUrl ? (
        <img
          src={coachAvatarUrl}
          alt=""
          className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-md border border-neutral-100"
        />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-text-primary text-white flex items-center justify-center shrink-0 shadow-md">
          <Dumbbell size={20} className="transform -rotate-45" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-serif font-semibold text-lg text-text-primary">Evoa</p>
        <p className="text-[10px] uppercase tracking-widest text-brand font-bold">Coach Portal</p>
      </div>
    </>
  );

  if (mode === 'presentation') {
    return (
      <div aria-hidden="true" className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link to="/coach/profile" onClick={onNavigate} className={className}>
      {content}
    </Link>
  );
}

const SidebarContent = ({
  headerMode,
  onNavigate,
  pathname,
  pendingCheckins = 0,
  coachAvatarUrl,
}: SidebarContentProps) => (
  <div className="flex flex-col h-full bg-white text-text-primary border-r border-neutral-100">
    {/* Brand / Profile Area */}
    <div className="p-6 mb-4 px-3 border-b border-neutral-50 rounded-md flex items-center justify-between">
      <CoachIdentity coachAvatarUrl={coachAvatarUrl} mode={headerMode} onNavigate={onNavigate} />
      {headerMode === 'interactive' ? <NotificationBell align="left" /> : null}
    </div>

    {/* Navigation */}
    <nav className="flex flex-1 flex-col gap-1 px-4 py-2 overflow-y-auto">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href || (link.href !== '/coach' && pathname.startsWith(link.href));

        return (
          <Link
            key={link.name}
            to={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
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
  const [mobileMenuState, setMobileMenuState] = useState<MobileMenuState>('closed');
  const isMobileDialogOpen = mobileMenuState !== 'closed';
  const isMobileMenuOpen = mobileMenuState === 'open';
  const mobileDialogRef = useRef<HTMLDivElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { getPendingCheckins } = useCheckins();
  const { coachProfile } = useCoachProfile();
  const pendingCount = getPendingCheckins().length;
  const coachAvatarUrl = coachProfile.avatarUrl;
  const closeMobileMenu = useCallback(() => {
    setMobileMenuState((currentState) => (currentState === 'closed' ? 'closed' : 'closing'));
  }, []);
  const closeMobileMenuImmediately = useCallback(() => {
    setMobileMenuState('closed');
  }, []);
  const reopenMobileMenu = useCallback(() => {
    setMobileMenuState('open');
  }, []);

  useCloseMobileNavigationOnDesktop({
    close: closeMobileMenuImmediately,
    isOpen: isMobileDialogOpen,
    mobileControlRef: mobileTriggerRef,
  });

  // The open copy belongs inside Radix's focus scope; the page copy retains
  // the trigger that receives focus after the dialog finishes closing.
  const renderMobileTopBar = (placement: 'page' | 'dialog') => {
    const isActiveHeader = placement === 'dialog' ? isMobileDialogOpen : !isMobileDialogOpen;
    const menuButton = (
      <button
        aria-controls="coach-mobile-navigation-overlay"
        aria-expanded={isMobileMenuOpen}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        className="p-2 -mr-2 text-text-secondary hover:text-text-primary"
        onClick={placement === 'dialog' && !isMobileMenuOpen ? reopenMobileMenu : undefined}
        ref={placement === 'page' ? mobileTriggerRef : undefined}
        type="button"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    );

    return (
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 h-16 bg-white text-text-primary border-b border-neutral-100 rounded-md flex items-center justify-between px-6 z-50 shadow-sm ${
          isActiveHeader ? '' : 'invisible'
        }`}
      >
        <Link
          to="/coach/profile"
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
        >
          {coachAvatarUrl ? (
            <img
              src={coachAvatarUrl}
              alt=""
              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-neutral-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-text-primary text-white flex items-center justify-center shrink-0">
              <Dumbbell size={16} className="transform -rotate-45" />
            </div>
          )}
          <span className="font-serif font-semibold text-sm">Coach Portal</span>
        </Link>
        <div className="flex items-center gap-4">
          {isActiveHeader ? <NotificationBell /> : null}
          {placement === 'page' ? (
            <NavigationDialogTrigger asChild>{menuButton}</NavigationDialogTrigger>
          ) : isMobileMenuOpen ? (
            <NavigationDialogClose asChild>{menuButton}</NavigationDialogClose>
          ) : (
            menuButton
          )}
        </div>
      </div>
    );
  };

  return (
    <NavigationDialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          reopenMobileMenu();
          return;
        }
        closeMobileMenu();
      }}
      open={isMobileDialogOpen}
    >
      {renderMobileTopBar('page')}

      {/* Mobile Menu Overlay */}
      <NavigationDialogPortal>
        <NavigationDialogOverlay className="fixed inset-0" />
        <NavigationDialogContent
          aria-describedby={undefined}
          className="lg:hidden fixed inset-0 z-40 outline-none"
          id="coach-mobile-navigation-overlay"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            mobileDialogRef.current?.querySelector<HTMLElement>('nav a[href]')?.focus();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeMobileMenu();
            }
          }}
          ref={mobileDialogRef}
        >
          <motion.div
            animate={{ opacity: isMobileMenuOpen ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 bg-text-primary/20 backdrop-blur-sm"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
          />
          {renderMobileTopBar('dialog')}
          <NavigationDialogTitle className="sr-only">
            Coach portal mobile navigation
          </NavigationDialogTitle>
          <motion.div
            animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
            className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl"
            initial={prefersReducedMotion ? false : { x: '-100%' }}
            onAnimationComplete={() => {
              setMobileMenuState((currentState) =>
                currentState === 'closing' ? 'closed' : currentState,
              );
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', damping: 25, stiffness: 200 }
            }
          >
            <SidebarContent
              onNavigate={closeMobileMenu}
              headerMode="presentation"
              pathname={location.pathname}
              pendingCheckins={pendingCount}
              coachAvatarUrl={coachAvatarUrl}
            />
          </motion.div>
        </NavigationDialogContent>
      </NavigationDialogPortal>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 bg-white z-50">
        <SidebarContent
          onNavigate={closeMobileMenu}
          headerMode="interactive"
          pathname={location.pathname}
          pendingCheckins={pendingCount}
          coachAvatarUrl={coachAvatarUrl}
        />
      </div>
    </NavigationDialog>
  );
}
