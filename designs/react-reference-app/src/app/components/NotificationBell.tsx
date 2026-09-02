import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications, type Notification } from '../context/NotificationContext';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { BottomSheet } from './ui/bottom-sheet';
import { useIsMobile } from './ui/use-mobile';

interface NotificationBellProps {
  align?: 'left' | 'right';
}

export function NotificationBell({ align = 'right' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <TriggerButton
        unreadCount={unreadCount}
        onClick={() => setIsOpen(open => !open)}
        ariaExpanded={isOpen}
      />
      {isMobile ? (
        <MobileNotificationSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      ) : (
        <DesktopNotificationPopover
          open={isOpen}
          onClose={() => setIsOpen(false)}
          align={align}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </>
  );
}

function TriggerButton({
  unreadCount,
  onClick,
  ariaExpanded,
}: {
  unreadCount: number;
  onClick: () => void;
  ariaExpanded: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      aria-expanded={ariaExpanded}
      className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 relative"
    >
      <Bell size={18} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full ring-2 ring-white" />
      )}
    </button>
  );
}

function DesktopNotificationPopover({
  open,
  onClose,
  align,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: {
  open: boolean;
  onClose: () => void;
  align: 'left' | 'right';
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <div className="relative" ref={containerRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Notifications"
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100/50 z-50 overflow-hidden`}
          >
            <NotificationHeader unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} />
            <NotificationList
              notifications={notifications}
              onItemClick={id => {
                onMarkAsRead(id);
                onClose();
              }}
              maxHeightClass="max-h-80"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNotificationSheet({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      className="h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-2 pb-3 border-b border-neutral-100">
        <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors flex items-center gap-1 px-2 min-h-10"
          >
            <Check size={14} strokeWidth={3} aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>
      <NotificationList
        notifications={notifications}
        onItemClick={id => {
          onMarkAsRead(id);
          onOpenChange(false);
        }}
        maxHeightClass="flex-1"
      />
    </BottomSheet>
  );
}

function NotificationHeader({
  unreadCount,
  onMarkAllAsRead,
}: {
  unreadCount: number;
  onMarkAllAsRead: () => void;
}) {
  return (
    <div className="p-4 border-b border-neutral-50 flex items-center justify-between bg-white">
      <h3 className="font-semibold text-text-primary text-sm">Notifications</h3>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors flex items-center gap-1"
        >
          <Check size={12} strokeWidth={3} aria-hidden="true" />
          Mark all read
        </button>
      )}
    </div>
  );
}

function NotificationList({
  notifications,
  onItemClick,
  maxHeightClass,
}: {
  notifications: Notification[];
  onItemClick: (id: string) => void;
  maxHeightClass: string;
}) {
  if (notifications.length === 0) {
    return (
      <div className={`${maxHeightClass} overflow-y-auto bg-white`}>
        <div className="p-8 text-center text-sm text-neutral-600">No notifications yet.</div>
      </div>
    );
  }

  return (
    <div className={`${maxHeightClass} overflow-y-auto bg-white`}>
      <div className="flex flex-col">
        {notifications.map(notif => (
          <Link
            key={notif.id}
            to={notif.link}
            onClick={() => onItemClick(notif.id)}
            className={`p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${
              !notif.read ? 'bg-neutral-50/50' : ''
            }`}
          >
            <div className="flex gap-3">
              <div className="mt-1">
                {!notif.read ? (
                  <div className="w-2 h-2 rounded-full bg-brand" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-transparent" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm ${!notif.read ? 'font-semibold text-text-primary' : 'font-medium text-neutral-600'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{notif.message}</p>
                <p className="text-[10px] font-semibold text-neutral-600 mt-2 uppercase tracking-widest">
                  {notif.time}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
