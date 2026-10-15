import { Bell, Check } from "lucide-react";
import {
  forwardRef,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";
import { Link as RouterLink } from "react-router";

import { cn } from "../lib/cn";
import { useIsMobileViewport } from "../lib/viewport";
import { AttentionDot } from "../primitives/attention-dot";
import { IconButton } from "../primitives/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";
import { BottomSheet } from "./bottom-sheet";

export type NotificationBellItem = {
  id: string;
  title: string;
  line: string;
  ago: string;
  unread: boolean;
  href: string;
};

type NotificationBellProps = {
  align?: "start" | "end";
  items: readonly NotificationBellItem[];
  onMarkAllRead: () => void;
  onOpenChange?: (open: boolean) => void;
  onOpenItem: (id: string) => void;
  open?: boolean;
  unreadCount: number;
};

type BellLayout = "popover" | "sheet";

type BellHeaderLayout = {
  check: number;
  frame: string;
  markAll: string;
  title: string;
};

const BELL_TITLE = "Notifications";

const HEADER_LAYOUTS: Record<BellLayout, BellHeaderLayout> = {
  popover: {
    check: 12,
    frame: "border-stroke-quiet p-4 px-3",
    markAll: "",
    title: "text-sm",
  },
  sheet: {
    check: 14,
    frame: "border-stroke-faint px-5 pt-2 pb-3",
    markAll: "min-h-10 px-2",
    title: "text-base",
  },
};

export function NotificationBell(props: NotificationBellProps) {
  const {
    align = "end",
    items,
    onMarkAllRead,
    onOpenChange,
    onOpenItem,
    open,
    unreadCount,
  } = props;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;
  const isMobile = useIsMobileViewport();
  const followingItem = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const openItem = (id: string) => {
    followingItem.current = true;
    onOpenItem(id);
    setIsOpen(false);
  };
  const markEveryItemRead = () => {
    onMarkAllRead();
    heading.current?.focus();
  };
  const header = {
    heading,
    onMarkAllRead: markEveryItemRead,
    unreadCount,
  };

  if (isMobile) {
    return (
      <>
        <BellTrigger
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          unreadCount={unreadCount}
        />
        <BottomSheet
          className="h-[80vh]"
          onOpenChange={setIsOpen}
          open={isOpen}
          title={BELL_TITLE}
        >
          <BellHeader {...header} layout="sheet" />
          <BellList className="flex-1" items={items} onOpenItem={openItem} />
        </BottomSheet>
      </>
    );
  }

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <BellTrigger unreadCount={unreadCount} />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-label={BELL_TITLE}
        className="w-80 overflow-hidden rounded-card border-stroke-faint/50 p-0 shadow-xl"
        onCloseAutoFocus={(event) => {
          if (!followingItem.current) {
            return;
          }
          followingItem.current = false;
          event.preventDefault();
        }}
        sideOffset={8}
      >
        <BellHeader {...header} layout="popover" />
        <BellList className="max-h-80" items={items} onOpenItem={openItem} />
      </PopoverContent>
    </Popover>
  );
}

type BellTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label"
> & {
  unreadCount: number;
};

const BellTrigger = forwardRef<HTMLButtonElement, BellTriggerProps>(
  function BellTrigger(props, ref) {
    const { unreadCount, ...buttonProps } = props;

    return (
      <IconButton
        aria-label={
          unreadCount > 0 ? `${BELL_TITLE}, ${unreadCount} unread` : BELL_TITLE
        }
        data-parity-root="NotificationBell"
        ref={ref}
        variant="muted"
        {...buttonProps}
      >
        <Bell aria-hidden="true" size={18} />
        {unreadCount > 0 && (
          <AttentionDot className="absolute top-2 right-2 ring-2 ring-surface-base" />
        )}
      </IconButton>
    );
  },
);

type BellHeaderProps = {
  heading: RefObject<HTMLHeadingElement | null>;
  layout: BellLayout;
  onMarkAllRead: () => void;
  unreadCount: number;
};

function BellHeader(props: BellHeaderProps) {
  const { heading, layout, onMarkAllRead, unreadCount } = props;
  const styles = HEADER_LAYOUTS[layout];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-field border-b bg-surface-base",
        styles.frame,
      )}
    >
      <h2
        className={cn("font-semibold text-text-primary", styles.title)}
        ref={heading}
        tabIndex={-1}
      >
        {BELL_TITLE}
      </h2>
      {unreadCount > 0 && (
        <button
          className={cn(
            "flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover",
            styles.markAll,
          )}
          data-parity="notification-mark-all"
          onClick={onMarkAllRead}
          type="button"
        >
          <Check aria-hidden="true" size={styles.check} strokeWidth={3} />
          Mark all read
        </button>
      )}
    </div>
  );
}

type BellListProps = {
  className: string;
  items: readonly NotificationBellItem[];
  onOpenItem: (id: string) => void;
};

function BellList(props: BellListProps) {
  const { className, items, onOpenItem } = props;

  return (
    <div className={cn("overflow-y-auto bg-surface-base", className)}>
      {items.length === 0 ? (
        <p
          className="p-8 text-center text-sm text-text-secondary"
          data-parity="notification-empty"
        >
          No notifications yet.
        </p>
      ) : (
        <ul className="flex flex-col" data-parity="notification-list">
          {items.map((item) => (
            <li data-parity="notification-row" key={item.id}>
              <BellRow item={item} onOpen={() => onOpenItem(item.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type BellRowProps = {
  item: NotificationBellItem;
  onOpen: () => void;
};

function BellRow(props: BellRowProps) {
  const { item, onOpen } = props;

  return (
    <RouterLink
      className={cn(
        "flex gap-3 border-b border-stroke-quiet p-4 transition-colors hover:bg-surface-quiet",
        { "bg-surface-quiet/50": item.unread },
      )}
      data-focus-inset
      onClick={onOpen}
      to={item.href}
    >
      <span className="mt-1.5 shrink-0">
        {item.unread ? (
          <>
            <AttentionDot />
            <span className="sr-only">Unread: </span>
          </>
        ) : (
          <span aria-hidden="true" className="block size-2" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn("block text-sm", {
            "font-semibold text-text-primary": item.unread,
            "font-medium text-text-secondary": !item.unread,
          })}
        >
          {item.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs text-text-secondary">
          {item.line}
        </span>
        <span className="mt-2 block text-micro font-semibold tracking-widest text-text-secondary uppercase">
          {item.ago}
        </span>
      </span>
    </RouterLink>
  );
}
