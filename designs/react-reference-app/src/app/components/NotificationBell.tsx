import { forwardRef, useRef, useState, type ComponentPropsWithoutRef, type RefObject } from 'react';
import { Bell, Check } from 'lucide-react';
import { Link } from 'react-router';
import { useNotifications, type BellItem } from '../context/NotificationContext';
import { AttentionDot } from './AttentionDot';
import { BottomSheet } from './ui/bottom-sheet';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useIsMobile } from './ui/use-mobile';
import { cn } from './ui/utils';

interface NotificationBellProps {
  align?: 'start' | 'end';
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

type BellLayout = 'popover' | 'sheet';

const HEADER_LAYOUT: Record<BellLayout, { frame: string; title: string; markAll: string; check: number }> = {
  popover: {
    frame: 'p-4 px-3 border-neutral-50',
    title: 'text-sm',
    markAll: '',
    check: 12,
  },
  sheet: {
    frame: 'px-5 pt-2 pb-3 border-neutral-100',
    title: 'text-base',
    markAll: 'px-2 min-h-10',
    check: 14,
  },
};

type BellListProps = {
  items: BellItem[];
  unreadCount: number;
  onOpenItem: (id: string) => void;
  onMarkAllRead: () => void;
};

export function NotificationBell({ align = 'end', onOpenChange, open }: NotificationBellProps) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;
  const isMobile = useIsMobile();
  const followingItem = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const openItem = (id: string) => {
    followingItem.current = true;
    markRead(id);
    setIsOpen(false);
  };
  const markEveryItemRead = () => {
    markAllRead();
    heading.current?.focus();
  };
  const list = { items, unreadCount, onOpenItem: openItem, onMarkAllRead: markEveryItemRead };

  if (isMobile) {
    return (
      <>
        <BellTrigger unreadCount={unreadCount} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} />
        <BottomSheet open={isOpen} onOpenChange={setIsOpen} title="Notifications" className="h-[80vh]">
          <BellHeader
            heading={heading}
            unreadCount={unreadCount}
            onMarkAllRead={markEveryItemRead}
            layout="sheet"
          />
          <BellList {...list} className="flex-1" />
        </BottomSheet>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <BellTrigger unreadCount={unreadCount} />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        aria-label="Notifications"
        className="w-80 p-0 overflow-hidden rounded-card border-neutral-100/50 bg-white shadow-xl"
        onCloseAutoFocus={(event) => {
          if (!followingItem.current) return;
          followingItem.current = false;
          event.preventDefault();
        }}
      >
        <BellHeader
          heading={heading}
          unreadCount={unreadCount}
          onMarkAllRead={markEveryItemRead}
          layout="popover"
        />
        <BellList {...list} className="max-h-80" />
      </PopoverContent>
    </Popover>
  );
}

const BellTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { unreadCount: number }
>(function BellTrigger({ unreadCount, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors text-text-secondary relative',
        className,
      )}
      {...props}
    >
      <Bell size={18} aria-hidden="true" />
      {unreadCount > 0 && <AttentionDot className="absolute top-2 right-2 ring-2 ring-white" />}
    </button>
  );
});

function BellHeader({
  heading,
  unreadCount,
  onMarkAllRead,
  layout,
}: {
  heading: RefObject<HTMLHeadingElement>;
  unreadCount: number;
  onMarkAllRead: () => void;
  layout: BellLayout;
}) {
  const styles = HEADER_LAYOUT[layout];

  return (
    <div className={cn('flex items-center justify-between gap-2 border-b rounded-field bg-white', styles.frame)}>
      <h2 ref={heading} tabIndex={-1} className={cn('font-semibold text-text-primary', styles.title)}>
        Notifications
      </h2>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllRead}
          data-parity="notification-mark-all"
          className={cn(
            'text-xs font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1',
            styles.markAll,
          )}
        >
          <Check size={styles.check} strokeWidth={3} aria-hidden="true" />
          Mark all read
        </button>
      )}
    </div>
  );
}

function BellList({ items, onOpenItem, className }: BellListProps & { className: string }) {
  if (items.length === 0) {
    return (
      <div className={cn('overflow-y-auto bg-white', className)}>
        <p className="p-8 text-center text-sm text-text-secondary" data-parity="notification-empty">
          No notifications yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-y-auto bg-white', className)}>
      <ul className="flex flex-col" data-parity="notification-list">
        {items.map((item) => (
          <li key={item.id} data-parity="notification-row">
            <Link
              to={item.href}
              onClick={() => onOpenItem(item.id)}
              data-focus-inset
              className={cn(
                'flex gap-3 p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors',
                { 'bg-neutral-50/50': item.unread },
              )}
            >
              <span className="mt-1.5 shrink-0">
                {item.unread ? (
                  <>
                    <AttentionDot />
                    <span className="sr-only">Unread: </span>
                  </>
                ) : (
                  <span aria-hidden="true" className="block size-2" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn('block text-sm', {
                    'font-semibold text-text-primary': item.unread,
                    'font-medium text-text-secondary': !item.unread,
                  })}
                >
                  {item.title}
                </span>
                <span className="block text-xs text-text-secondary mt-1 line-clamp-2">{item.line}</span>
                <span className="block text-[10px] font-semibold text-text-secondary mt-2 uppercase tracking-widest">
                  {item.ago}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
