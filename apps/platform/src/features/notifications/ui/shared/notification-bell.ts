import type { NotificationParty } from "@eli-coach-platform/domain/notification";
import type { NotificationBellItem } from "@eli-coach-platform/ui/layout";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { pageFocusAction, toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { generatePath, useFetcher, useNavigate, useSubmit } from "react-router";

import {
  notificationBellSchema,
  type DescribedNotification,
  type NotificationBellReply,
  type NotificationDescriber,
  type NotificationReading,
  type NotificationReply,
} from "~/features/notifications/public/notifications";
import { NOTIFICATIONS_API_PATHS } from "~/features/notifications/public/paths";

type NotificationBellOptions = {
  bell: NotificationBellReply;
  describers: readonly NotificationDescriber[];
  party: NotificationParty;
};

type NotificationBellBinding = {
  items: NotificationBellItem[];
  onMarkAllRead: () => void;
  onOpenItem: (id: string) => void;
  unreadCount: number;
};

const BELL_CHECK_KEY = "notification-bell";
const MARK_ALL_READ_KEY = "notification-bell-read-all";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type BellArrivals = {
  bell: NotificationBellReply;
  checked: NotificationBellReply | null;
  describe: (notification: NotificationReply) => DescribedNotification | null;
  markRead: (id: string) => void;
};

type OptimisticReads = {
  isReadHere: (id: string) => boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
  unreadCount: number;
};

export function useNotificationBell(
  options: NotificationBellOptions,
): NotificationBellBinding {
  const { bell, describers, party } = options;
  const timeZone = useCalendarDayTimeZone();
  const checked = useMinuteBellCheck();
  const shown = newerBellOf(bell, checked);
  const reads = useOptimisticReads(shown);
  const reading: NotificationReading = { party, timeZone };
  const describe = (notification: NotificationReply) =>
    firstDescriptionOf(describers, { notification, reading });

  useArrivalToasts({ bell, checked, describe, markRead: reads.markRead });

  const items = shown.notifications.flatMap((notification) => {
    const described = describe(notification);

    return described === null
      ? []
      : [
          {
            ...described,
            ago: timeAgo(notification.arrivedAt, shown.checkedAt),
            id: notification.id,
            unread: notification.unread && !reads.isReadHere(notification.id),
          },
        ];
  });

  return {
    items,
    onMarkAllRead: reads.markAllRead,
    onOpenItem: reads.markRead,
    unreadCount: reads.unreadCount,
  };
}

function useMinuteBellCheck(): NotificationBellReply | null {
  const check = useFetcher<unknown>({ key: BELL_CHECK_KEY });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const checkBell = () => {
      void check.load(NOTIFICATIONS_API_PATHS.bell);
    };
    const keepChecking = () => {
      clearInterval(interval);
      interval = isVisible() ? setInterval(checkBell, MINUTE_MS) : undefined;
    };
    const followVisibility = () => {
      if (isVisible()) {
        checkBell();
      }
      keepChecking();
    };

    keepChecking();
    document.addEventListener("visibilitychange", followVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", followVisibility);
    };
  }, [check.load]);

  return useMemo(() => checkedBellOf(check.data), [check.data]);
}

function useArrivalToasts(arrivals: BellArrivals): void {
  const { bell, checked } = arrivals;
  const navigate = useNavigate();
  const known = useRef(new Set<string>());
  const toastArrival = useEffectEvent((notification: NotificationReply) => {
    const described = arrivals.describe(notification);

    if (described === null) {
      return;
    }

    toast(described.title, {
      action: pageFocusAction({
        label: "View",
        onSelect: () => {
          arrivals.markRead(notification.id);
          void navigate(described.href);
        },
      }),
      description: described.line,
    });
  });

  useEffect(() => {
    bell.notifications.forEach(({ id }) => known.current.add(id));
  }, [bell]);

  useEffect(() => {
    if (checked === null) {
      return;
    }

    checked.notifications.forEach((notification) => {
      if (known.current.has(notification.id)) {
        return;
      }

      known.current.add(notification.id);

      if (!notification.unread) {
        return;
      }

      toastArrival(notification);
    });
  }, [checked]);
}

function useOptimisticReads(shown: NotificationBellReply): OptimisticReads {
  const submit = useSubmit();
  const markAll = useFetcher<unknown>({ key: MARK_ALL_READ_KEY });
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const readHere = shown.notifications.filter(
    (notification) => notification.unread && readIds.has(notification.id),
  ).length;

  return {
    isReadHere: (id) => readIds.has(id),
    markAllRead: () => {
      setReadIds(
        (current) =>
          new Set([
            ...current,
            ...shown.notifications.map((notification) => notification.id),
          ]),
      );
      void markAll.submit(null, {
        action: NOTIFICATIONS_API_PATHS.readAll,
        method: "post",
      });
    },
    markRead: (id) => {
      setReadIds((current) => new Set([...current, id]));
      void submit(null, {
        action: generatePath(NOTIFICATIONS_API_PATHS.read, {
          notificationId: id,
        }),
        fetcherKey: `notification-read:${id}`,
        method: "post",
        navigate: false,
      });
    },
    unreadCount: Math.max(0, shown.unreadCount - readHere),
  };
}

function newerBellOf(
  bell: NotificationBellReply,
  checked: NotificationBellReply | null,
): NotificationBellReply {
  return checked !== null &&
    Date.parse(checked.checkedAt) > Date.parse(bell.checkedAt)
    ? checked
    : bell;
}

function checkedBellOf(data: unknown): NotificationBellReply | null {
  const parsed = notificationBellSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
}

function firstDescriptionOf(
  describers: readonly NotificationDescriber[],
  subject: { notification: NotificationReply; reading: NotificationReading },
): DescribedNotification | null {
  for (const describe of describers) {
    const answer = describe(subject.notification, subject.reading);

    if (answer !== null) {
      return answer;
    }
  }

  return null;
}

function isVisible(): boolean {
  return document.visibilityState === "visible";
}

function timeAgo(arrivedAt: string, checkedAt: string): string {
  const elapsed = Date.parse(checkedAt) - Date.parse(arrivedAt);

  if (elapsed < MINUTE_MS) return "Just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`;

  const days = Math.floor(elapsed / DAY_MS);

  return days === 1 ? "1 day ago" : `${days} days ago`;
}
