import { Link, useLocation } from 'react-router';
import { Activity, Calendar, Utensils, PlaySquare, Menu, X, User, MessageSquare, CalendarDays, Video, History, Droplet } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { useCheckins } from '../../context/CheckinContext';
import { formatCheckinDate, formatCheckinTime } from '../../utils/dateFormatters';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from '../NotificationBell';

export function PortalSidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { appState } = useAppState();
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins('c1')[0];

  const links = [
    { name: 'Dashboard', href: '/portal', icon: Activity },
    { name: 'My Plan', href: '/portal/plan', icon: Calendar },
    { name: 'History', href: '/portal/history', icon: History },
    { name: 'Cycle', href: '/portal/cycle', icon: Droplet },
    { name: 'Nutrition', href: '#', icon: Utensils },
    { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
    { name: 'Resources', href: '#', icon: PlaySquare },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-[#121212] border-r border-neutral-100">
      {/* Profile Area */}
      <div className="p-6 mb-4 border-b border-neutral-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#121212]">Jane Doe</p>
            <p className="text-xs text-neutral-500">Active Client</p>
          </div>
        </div>
        <NotificationBell align="left" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href || (link.href !== '/portal' && location.pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-[#C81D6B]/5 text-[#C81D6B] font-medium' 
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#121212] font-medium'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Next check-in widget */}
      {nextCheckin && (
        <div className="mx-4 mb-6 p-4 rounded-2xl bg-[#C81D6B]/5 border border-[#C81D6B]/10">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={14} className="text-[#C81D6B]" />
            <span className="text-[10px] font-bold text-[#C81D6B] uppercase tracking-widest">Next Check-in</span>
          </div>
          <p className="text-sm font-semibold text-[#121212]">{formatCheckinDate(nextCheckin.date)}</p>
          <p className="text-xs text-neutral-500 mb-3">{formatCheckinTime(nextCheckin.time)}</p>
          <a
            href="https://meet.google.com/mock-eli-checkin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold rounded-xl bg-[#121212] text-white hover:bg-neutral-800 transition-colors"
          >
            <Video size={14} />
            Join Meet
          </a>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white text-[#121212] border-b border-neutral-100 flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center">
            <User size={16} />
          </div>
          <span className="font-semibold text-sm">Jane Doe</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-2 text-neutral-500 hover:text-[#121212]"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-[#121212]/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <SidebarContent />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 bg-white z-50">
        <SidebarContent />
      </div>
    </>
  );
}