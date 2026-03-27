import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { useAppState } from './AppContext';

export type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const COACH_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'New Message',
    message: 'Jane Doe sent you a message.',
    time: '10 mins ago',
    read: false,
    link: '/coach/messages?client=c1'
  },
  {
    id: '2',
    title: 'Check-in Requested',
    message: 'Jessica Alba requested an ad-hoc check-in for Friday.',
    time: '1 hour ago',
    read: false,
    link: '/coach/checkins?focus=ck-4'
  },
  {
    id: '3',
    title: 'Check-in Requested',
    message: 'Emma Stone requested an ad-hoc check-in for Tuesday.',
    time: '2 hours ago',
    read: false,
    link: '/coach/checkins?focus=ck-5'
  }
];

const CLIENT_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Coach Eli',
    message: 'Your coach replied to your message.',
    time: '10 mins ago',
    read: false,
    link: '/portal/messages'
  },
  {
    id: '2',
    title: 'Check-in Scheduled',
    message: 'Your weekly check-in is confirmed for Wednesday at 10:00 AM.',
    time: '1 day ago',
    read: true,
    link: '/portal/messages'
  }
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { appState } = useAppState();

  const [notifications, setNotifications] = useState<Notification[]>(
    appState.role === 'client' ? CLIENT_NOTIFICATIONS : COACH_NOTIFICATIONS
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      time: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    // Show toast
    toast(newNotif.title, {
      description: newNotif.message,
      action: {
        label: 'View',
        onClick: () => {
          navigateRef.current(newNotif.link);
        }
      },
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}