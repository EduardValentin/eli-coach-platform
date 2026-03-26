import { Link, useLocation } from 'react-router';
import { Activity, Calendar, Utensils, PlaySquare, Menu, X, User, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from '../NotificationBell';

export function PortalSidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { appState } = useAppState();

  const links = [
    { name: 'Dashboard', href: '/portal', icon: Activity },
    { name: 'My Plan', href: '/portal/plan', icon: Calendar },
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