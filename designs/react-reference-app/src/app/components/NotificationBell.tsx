import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#C81D6B] rounded-full ring-2 ring-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-80 bg-white rounded-2xl shadow-xl border border-neutral-100/50 z-50 overflow-hidden`}
          >
            <div className="p-4 border-b border-neutral-50 flex items-center justify-between bg-white">
              <h3 className="font-semibold text-[#121212] text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-[#C81D6B] hover:text-[#a31556] transition-colors flex items-center gap-1"
                >
                  <Check size={12} strokeWidth={3} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto bg-white">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  No notifications yet.
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      to={notif.link}
                      onClick={() => {
                        markAsRead(notif.id);
                        setIsOpen(false);
                      }}
                      className={`p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${
                        !notif.read ? 'bg-neutral-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          {!notif.read ? (
                            <div className="w-2 h-2 rounded-full bg-[#C81D6B]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-transparent" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm ${!notif.read ? 'font-semibold text-[#121212]' : 'font-medium text-neutral-600'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] font-semibold text-neutral-400 mt-2 uppercase tracking-widest">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}