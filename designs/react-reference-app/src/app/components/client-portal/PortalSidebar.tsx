import { Link, useLocation, useNavigate } from 'react-router';
import { User, MoreHorizontal, LogOut, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useAppState } from '../../context/AppContext';
import { useClientProfile, fullName } from '../../context/ClientProfileContext';
import { NotificationBell } from '../NotificationBell';
import { navigationLinkSlug } from '../navigation-link-slug';
import { LABEL_CLASS } from '../typography';
import { BottomSheet } from '../ui/bottom-sheet';
import { Button } from '../ui/button';
import { useCloseMobileNavigationOnDesktop } from '../ui/use-close-mobile-navigation-on-desktop';
import { cn } from '../ui/utils';
import { NextCheckinCard } from './NextCheckinCard';
import type { ClientPortalLink } from './navigation-links';

export const PORTAL_MAIN_ID = 'portal-main';

const MAX_BAR_TABS = 4;

type MoreSheetState = 'open' | 'closed' | 'closed-for-desktop';

type NameBlockSize = 'md' | 'sm';

const AVATAR_BY_SIZE: Record<NameBlockSize, { className: string; iconSize: number }> = {
  md: { className: 'w-10 h-10', iconSize: 20 },
  sm: { className: 'w-9 h-9', iconSize: 18 },
};

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '#') return false;
  if (href === '/portal') return pathname === '/portal';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ClientNameBlock({
  size,
  onNavigate,
}: {
  size: NameBlockSize;
  onNavigate?: () => void;
}) {
  const { clientProfile } = useClientProfile();
  const displayName = clientProfile ? fullName(clientProfile) : 'Client';
  const avatar = AVATAR_BY_SIZE[size];

  return (
    <Link
      to="/portal/profile"
      onClick={onNavigate}
      data-parity="name-block"
      className="flex items-center gap-3 min-w-0 rounded-control hover:opacity-80 transition-opacity"
    >
      {clientProfile?.avatarUrl ? (
        <img
          src={clientProfile.avatarUrl}
          alt=""
          data-parity="avatar"
          className={cn(
            avatar.className,
            'rounded-full object-cover shrink-0 border border-border-subtle',
          )}
        />
      ) : (
        <div
          data-parity="avatar"
          className={cn(
            avatar.className,
            'rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0',
          )}
        >
          <User size={avatar.iconSize} />
        </div>
      )}
      <div className="min-w-0">
        <p
          data-parity="name"
          className="text-sm font-medium text-text-primary truncate"
        >
          {displayName}
        </p>
      </div>
    </Link>
  );
}

function DesktopSidebar({ links }: { links: ClientPortalLink[] }) {
  const location = useLocation();

  return (
    <aside
      aria-label="Client portal sidebar"
      className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 bg-surface-base z-50"
    >
      <div className="flex flex-col h-full bg-surface-base text-text-primary border-r border-stroke-faint">
        <div
          className="p-6 mb-4 px-3 border-b border-stroke-quiet rounded-field flex items-center justify-between"
          data-parity="sidebar-header"
        >
          <ClientNameBlock size="md" />
          <div className="contents" data-parity="notification-bell">
            <NotificationBell align="left" />
          </div>
        </div>

        <nav
          aria-label="Client portal navigation"
          className="flex flex-1 flex-col gap-1 px-4 py-2 overflow-y-auto"
        >
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(location.pathname, link.href);
            return (
              <Link
                key={link.name}
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                data-parity={`link-${navigationLinkSlug(link.name)}`}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 rounded-card transition-all',
                  {
                    'bg-primary-soft text-primary': isActive,
                    'text-text-secondary hover:bg-primary-soft hover:text-primary':
                      !isActive,
                  },
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mb-6" data-parity="next-checkin">
          <NextCheckinCard />
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  return (
    <header
      aria-label="Client portal top bar"
      className="lg:hidden fixed top-0 left-0 right-0 h-[calc(env(safe-area-inset-top)+4rem)] bg-surface-base text-text-primary border-b border-border-subtle rounded-field flex items-center justify-between px-6 z-50 shadow-card pt-[env(safe-area-inset-top)]"
    >
      <ClientNameBlock size="sm" />
      <div className="contents" data-parity="notification-bell">
        <NotificationBell />
      </div>
    </header>
  );
}

function MobileTabBar({
  links,
  moreLinks,
  moreOpen,
  moreButtonRef,
  onOpenMore,
}: {
  links: ClientPortalLink[];
  moreLinks: ClientPortalLink[];
  moreOpen: boolean;
  moreButtonRef: RefObject<HTMLButtonElement>;
  onOpenMore: () => void;
}) {
  const location = useLocation();
  const moreActive =
    moreOpen ||
    moreLinks.some((link) => isRouteActive(location.pathname, link.href));

  return (
    <nav
      aria-label="Client portal tabs"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-base border-t border-border-subtle z-40 shadow-tab-bar pb-[env(safe-area-inset-bottom)]"
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
                data-parity={`tab-${navigationLinkSlug(link.name)}`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full w-full transition-colors',
                  {
                    'bg-primary-soft text-primary': isActive,
                    'text-text-secondary hover:bg-primary-soft hover:text-primary':
                      !isActive,
                  },
                )}
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
            ref={moreButtonRef}
            type="button"
            onClick={onOpenMore}
            aria-expanded={moreOpen}
            aria-controls="portal-more-sheet"
            data-parity="tab-more"
            className={cn(
              'flex flex-col items-center justify-center gap-1 h-full w-full transition-colors',
              {
                'bg-primary-soft text-primary': moreActive,
                'text-text-secondary hover:bg-primary-soft hover:text-primary':
                  !moreActive,
              },
            )}
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

function MoreSheetNavigation({
  links,
  onClose,
}: {
  links: ClientPortalLink[];
  onClose: () => void;
}) {
  const location = useLocation();

  return (
    <nav
      aria-label="Client portal more"
      data-parity="more-navigation"
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
              data-parity={`sheet-link-${navigationLinkSlug(link.name)}`}
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
            data-parity={`sheet-link-${navigationLinkSlug(link.name)}`}
            className={cn(
              'flex items-center gap-4 px-4 min-h-14 rounded-card transition-colors',
              {
                'bg-primary-soft text-primary': isActive,
                'text-text-primary hover:bg-primary-soft hover:text-primary':
                  !isActive,
              },
            )}
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

      <div className="pt-4" data-parity="next-checkin">
        <NextCheckinCard />
      </div>
    </nav>
  );
}

function MoreSheetBody({
  links,
  onClose,
}: {
  links: ClientPortalLink[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { setAppState } = useAppState();

  const handleSignOut = () => {
    setAppState({ session: 'anonymous', hasBundle: false });
    onClose();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-5 pt-6 pb-4 border-b border-border-subtle rounded-field"
        data-parity="sheet-name-block"
      >
        <ClientNameBlock size="md" onNavigate={onClose} />
      </div>

      {links.length > 0 && (
        <MoreSheetNavigation links={links} onClose={onClose} />
      )}

      <div className="mt-auto border-t border-border-subtle px-4 py-3">
        <Button
          type="button"
          onClick={handleSignOut}
          variant="ghost-muted"
          data-parity="sheet-sign-out"
          className="w-full"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function PortalSidebar({
  links: portalLinks,
}: {
  links: readonly ClientPortalLink[];
}) {
  const [moreSheet, setMoreSheet] = useState<MoreSheetState>('closed');
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const { appState } = useAppState();
  const moreOpen = moreSheet === 'open';
  const includeLink = (link: ClientPortalLink) =>
    !link.postMvp || appState.prototypeMode === 'post-mvp';
  const links = portalLinks.filter(includeLink);
  const barLinks = links.filter((link) => link.tab).slice(0, MAX_BAR_TABS);
  const moreLinks = links.filter((link) => !barLinks.includes(link));

  const closeMoreForDesktop = useCallback(
    () => setMoreSheet('closed-for-desktop'),
    [],
  );

  useCloseMobileNavigationOnDesktop({
    close: closeMoreForDesktop,
    isOpen: moreOpen,
    mobileControlRef: moreButtonRef,
  });

  useEffect(() => {
    if (moreSheet === 'closed-for-desktop') {
      document.getElementById(PORTAL_MAIN_ID)?.focus();
    }
  }, [moreSheet]);

  return (
    <>
      <DesktopSidebar links={links} />
      <MobileTopBar />
      <MobileTabBar
        links={barLinks}
        moreLinks={moreLinks}
        moreOpen={moreOpen}
        moreButtonRef={moreButtonRef}
        onOpenMore={() => setMoreSheet('open')}
      />

      <BottomSheet
        id="portal-more-sheet"
        open={moreOpen}
        onOpenChange={(open) => setMoreSheet(open ? 'open' : 'closed')}
        title="More"
        className="h-[90vh] flex flex-col"
      >
        <MoreSheetBody links={moreLinks} onClose={() => setMoreSheet('closed')} />
      </BottomSheet>
    </>
  );
}
