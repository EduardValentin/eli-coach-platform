import {
  Activity,
  Calendar,
  CalendarCheck,
  Droplet,
  History,
  MessageSquare,
  PlaySquare,
  Settings,
  UserCircle,
  Utensils,
} from 'lucide-react';

export type ClientPortalLink = {
  name: string;
  slug: string;
  href: string;
  icon: typeof Activity;
  postMvp?: boolean;
  tab?: boolean;
};

export const CLIENT_PORTAL_LINKS: readonly ClientPortalLink[] = [
  {
    name: 'Dashboard',
    slug: 'dashboard',
    href: '/portal',
    icon: Activity,
    tab: true,
  },
  {
    name: 'My Plan',
    slug: 'plan',
    href: '/portal/plan',
    icon: Calendar,
    postMvp: true,
    tab: true,
  },
  {
    name: 'Messages',
    slug: 'messages',
    href: '/portal/messages',
    icon: MessageSquare,
    postMvp: true,
    tab: true,
  },
  {
    name: 'Check-ins',
    slug: 'checkins',
    href: '/portal/checkins',
    icon: CalendarCheck,
    tab: true,
  },
  {
    name: 'Profile',
    slug: 'profile',
    href: '/portal/profile',
    icon: UserCircle,
    tab: true,
  },
  { name: 'Cycle', slug: 'cycle', href: '/portal/cycle', icon: Droplet },
  {
    name: 'History',
    slug: 'history',
    href: '/portal/history',
    icon: History,
    postMvp: true,
  },
  {
    name: 'Nutrition',
    slug: 'nutrition',
    href: '/portal/nutrition',
    icon: Utensils,
    postMvp: true,
  },
  { name: 'Resources', slug: 'resources', href: '#', icon: PlaySquare },
  {
    name: 'Settings',
    slug: 'settings',
    href: '/portal/settings',
    icon: Settings,
  },
];
