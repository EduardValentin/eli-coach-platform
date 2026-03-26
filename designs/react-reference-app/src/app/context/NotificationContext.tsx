import { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Message',
      message: 'Jane Doe sent you a message.',
      time: '10 mins ago',
      read: false,
      link: '/coach/messages?client=c1'
    }
  ]);

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
          // This would ideally use react-router navigate, but simple window location works for mock
          window.location.href = newNotif.link;
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