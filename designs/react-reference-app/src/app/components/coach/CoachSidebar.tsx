import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Users, CalendarDays, Settings, Menu, X, Dumbbell, MessageSquare, Activity } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from '../NotificationBell';
import { useCheckins } from '../../context/CheckinContext';

const LINKS = [
  { name: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { name: 'Training', href: '/coach/training', icon: Activity },
  { name: 'Messages', href: '/coach/messages', icon: MessageSquare },
  { name: 'Clients', href: '/coach/clients', icon: Users },
  { name: 'Schedule', href: '/coach/checkins', icon: CalendarDays },
  { name: 'Settings', href: '#', icon: Settings },
];

const SidebarContent = ({ setIsMobileMenuOpen, pathname, pendingCheckins = 0 }: { setIsMobileMenuOpen: (v: boolean) => void, pathname: string, pendingCheckins?: number }) => (
  <div className="flex flex-col h-full bg-white text-[#121212] border-r border-neutral-100">
    {/* Brand / Profile Area */}
    <div className="p-6 mb-4 border-b border-neutral-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#121212] text-white flex items-center justify-center shrink-0 shadow-md">
          <Dumbbell size={20} className="transform -rotate-45" />
        </div>
        <div>
          <p className="font-serif font-semibold text-lg text-[#121212]">Eli Fitness</p>
          <p className="text-[10px] uppercase tracking-widest text-[#C81D6B] font-bold">Coach Portal</p>
        </div>
      </div>
      <NotificationBell align="left" />
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (link.href !== '/coach' && pathname.startsWith(link.href));
        
        return (
          <Link
            key={link.name}
            to={link.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
              isActive 
                ? 'bg-[#121212] text-white shadow-md' 
                : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#121212] font-medium'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-sm font-semibold">{link.name}</span>
            {link.name === 'Schedule' && pendingCheckins > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-[#FF7A45] text-white text-[10px] font-bold flex items-center justify-center">
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { getPendingCheckins } = useCheckins();
  const pendingCount = getPendingCheckins().length;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white text-[#121212] border-b border-neutral-100 flex items-center justify-between px-6 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#121212] text-white flex items-center justify-center">
            <Dumbbell size={16} className="transform -rotate-45" />
          </div>
          <span className="font-serif font-semibold text-sm">Coach Portal</span>
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
              <SidebarContent setIsMobileMenuOpen={setIsMobileMenuOpen} pathname={location.pathname} pendingCheckins={pendingCount} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 bg-white z-50">
        <SidebarContent setIsMobileMenuOpen={setIsMobileMenuOpen} pathname={location.pathname} pendingCheckins={pendingCount} />
      </div>
    </>
  );
}