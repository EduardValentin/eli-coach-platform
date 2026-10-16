import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { useAppState } from './AppContext';
import { useClientJourneys } from './ClientJourneyContext';
import {
  describeNotification,
  isPostMvpNotification,
  isUnread,
  latestInBell,
  recipientKey,
  timeAgo,
  unreadInBell,
  type BellNotification,
  type NotificationEvent,
  type NotificationReading,
  type NotificationRecipient,
} from '../domain/notifications';
import { DEMO_CLIENT } from '../services/demoClient';
import { browserTimeZone } from '../utils/dateFormatters';
import { needsReviewCall } from '../utils/reviewCallListing';

export type BellItem = {
  id: string;
  title: string;
  line: string;
  href: string;
  ago: string;
  unread: boolean;
};

export type OnceDelivery = {
  onceKey: string;
  recipient: NotificationRecipient;
  event: NotificationEvent;
  arrivedAt: Date;
};

export type InboxContents = {
  entries: Record<string, BellNotification[]>;
  onceKeys: readonly string[];
};

type Inbox = { entries: Record<string, BellNotification[]>; onceKeys: ReadonlySet<string> };

type NotificationContextType = {
  items: BellItem[];
  unreadCount: number;
  reading: NotificationReading | null;
  checkedAt: Date;
  deliver: (recipient: NotificationRecipient, event: NotificationEvent) => void;
  deliverOnce: (deliveries: readonly OnceDelivery[]) => void;
  replaceInbox: (contents: InboxContents) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const PROGRAM_READY_NOTIFICATION_ID = 'program-ready';

const MINUTE_MS = 60 * 1000;

const EMPTY_INBOX: Inbox = { entries: {}, onceKeys: new Set() };

function newNotificationId(): string {
  return 'nt-' + Math.random().toString(36).substring(2, 10);
}

function readerOf(session: string): NotificationRecipient | null {
  if (session === 'coach') return { party: 'coach' };
  if (session === 'client') return { party: 'client', clientId: DEMO_CLIENT.id };

  return null;
}

function withEntry(inbox: Inbox, recipient: NotificationRecipient, notification: BellNotification): Inbox {
  const key = recipientKey(recipient);

  return {
    ...inbox,
    entries: { ...inbox.entries, [key]: [notification, ...(inbox.entries[key] ?? [])] },
  };
}

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: number | undefined;
    const tick = () => setNow(new Date());
    const follow = () => {
      window.clearInterval(interval);
      if (document.visibilityState !== 'visible') return;
      tick();
      interval = window.setInterval(tick, MINUTE_MS);
    };
    follow();
    document.addEventListener('visibilitychange', follow);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', follow);
    };
  }, []);

  return now;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { appState } = useAppState();
  const { demoJourney } = useClientJourneys();
  const [inbox, setInbox] = useState<Inbox>(EMPTY_INBOX);
  const [programReadyAt] = useState(() => new Date());
  const now = useMinuteClock();

  const reader = readerOf(appState.session);
  const readerKey = reader ? recipientKey(reader) : null;
  const readerParty = reader?.party ?? null;
  const reading = useMemo(
    (): NotificationReading | null => (readerParty ? { party: readerParty, timeZone: browserTimeZone() } : null),
    [readerParty],
  );
  const includesPostMvp = appState.prototypeMode === 'post-mvp';
  const programReadyShown = includesPostMvp && readerParty === 'client' && needsReviewCall(demoJourney);

  const readerEntries = useMemo(() => {
    const stored = readerKey ? (inbox.entries[readerKey] ?? []) : [];
    const shown = stored.filter((notification) => includesPostMvp || !isPostMvpNotification(notification));
    if (!programReadyShown) return shown;

    const programReady: BellNotification = {
      id: PROGRAM_READY_NOTIFICATION_ID,
      kind: 'program.ready',
      facts: {},
      arrivedAt: programReadyAt,
      readAt: null,
    };
    return [programReady, ...shown];
  }, [inbox, readerKey, includesPostMvp, programReadyShown, programReadyAt]);

  const items = useMemo(
    () =>
      reading
        ? latestInBell(readerEntries, now).map((notification) => ({
            id: notification.id,
            ...describeNotification(notification, reading),
            ago: timeAgo(notification.arrivedAt, now),
            unread: isUnread(notification),
          }))
        : [],
    [readerEntries, reading, now],
  );
  const unreadCount = unreadInBell(readerEntries, now);

  const markRead = useCallback(
    (id: string) => {
      if (!readerKey) return;
      setInbox((current) => ({
        ...current,
        entries: {
          ...current.entries,
          [readerKey]: (current.entries[readerKey] ?? []).map((notification) =>
            notification.id === id && isUnread(notification) ? { ...notification, readAt: new Date() } : notification,
          ),
        },
      }));
    },
    [readerKey],
  );

  const markAllRead = useCallback(() => {
    if (!readerKey) return;
    const readAt = new Date();
    setInbox((current) => ({
      ...current,
      entries: {
        ...current.entries,
        [readerKey]: (current.entries[readerKey] ?? []).map((notification) =>
          isUnread(notification) ? { ...notification, readAt } : notification,
        ),
      },
    }));
  }, [readerKey]);

  const deliver = useCallback(
    (recipient: NotificationRecipient, event: NotificationEvent) => {
      const notification: BellNotification = { ...event, id: newNotificationId(), arrivedAt: new Date(), readAt: null };
      setInbox((current) => withEntry(current, recipient, notification));
      const shownToReader =
        reading !== null &&
        recipientKey(recipient) === readerKey &&
        (includesPostMvp || !isPostMvpNotification(event));
      if (!shownToReader) return;

      const { title, line, href } = describeNotification(notification, reading);
      toast(title, {
        description: line,
        action: {
          label: 'View',
          onClick: () => {
            markRead(notification.id);
            navigateRef.current(href);
          },
        },
      });
    },
    [reading, readerKey, includesPostMvp, markRead],
  );

  const deliverOnce = useCallback((deliveries: readonly OnceDelivery[]) => {
    setInbox((current) => {
      const fresh = deliveries.filter((delivery) => !current.onceKeys.has(delivery.onceKey));
      if (fresh.length === 0) return current;

      return fresh.reduce(
        (next, { recipient, event, arrivedAt, onceKey }) => ({
          ...withEntry(next, recipient, { ...event, id: newNotificationId(), arrivedAt, readAt: null }),
          onceKeys: new Set([...next.onceKeys, onceKey]),
        }),
        current,
      );
    });
  }, []);

  const replaceInbox = useCallback((contents: InboxContents) => {
    setInbox({ entries: contents.entries, onceKeys: new Set(contents.onceKeys) });
  }, []);

  return (
    <NotificationContext.Provider
      value={{ items, unreadCount, reading, checkedAt: now, deliver, deliverOnce, replaceInbox, markRead, markAllRead }}
    >
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
