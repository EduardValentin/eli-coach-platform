import {
  Activity,
  Calendar,
  CalendarCheck,
  Droplet,
  FolderOpen,
  MessageSquare,
  Settings,
  UserCircle,
  Utensils,
} from 'lucide-react';

export type ClientPortalLink = {
  name: string;
  href: string;
  icon: typeof Activity;
  postMvp?: boolean;
  tab?: boolean;
};

export const CLIENT_PORTAL_LINKS: readonly ClientPortalLink[] = [
  {
    name: 'Dashboard',
    href: '/portal',
    icon: Activity,
    tab: true,
  },
  {
    name: 'Program',
    href: '/portal/program',
    icon: Calendar,
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
  {
    name: 'Profile',
    href: '/portal/profile',
    icon: UserCircle,
    tab: true,
  },
  { name: 'Cycle', href: '/portal/cycle', icon: Droplet, postMvp: true },
  {
    name: 'Nutrition',
    href: '/portal/nutrition',
    icon: Utensils,
    postMvp: true,
  },
  { name: 'Resources', href: '/portal/resources', icon: FolderOpen },
  {
    name: 'Settings',
    href: '/portal/settings',
    icon: Settings,
  },
];
