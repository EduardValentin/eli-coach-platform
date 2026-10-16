// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";

import {
  NotificationBell,
  type NotificationBellItem,
} from "./notification-bell";

const PHONE_WIDTH = 390;
const DESKTOP_WIDTH = 1280;

const REQUESTED: NotificationBellItem = {
  id: "n-1",
  title: "Check-in requested",
  line: "Jane Doe asked for a check-in on Fri, Oct 16 at 6:00 PM.",
  ago: "5 min ago",
  unread: true,
  href: "/coach/checkins?checkin=ck-1",
};

const EXPIRED: NotificationBellItem = {
  id: "n-2",
  title: "Check-in request expired",
  line: "Jane Doe's check-in on Thu, Oct 15 at 6:00 PM was not answered in time.",
  ago: "2 h ago",
  unread: true,
  href: "/coach/checkins?checkin=ck-2",
};

const APPROVED: NotificationBellItem = {
  id: "n-3",
  title: "Check-in approved",
  line: "Jane Doe approved the check-in on Wed, Oct 14 at 6:00 PM.",
  ago: "1 day ago",
  unread: false,
  href: "/coach/checkins?checkin=ck-3",
};

const axe = configureAxe({ rules: { region: { enabled: false } } });

let viewportWidth = DESKTOP_WIDTH;

function maxWidthOf(query: string): number {
  const match = /max-width:\s*(\d+)px/.exec(query);

  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

beforeEach(() => {
  viewportWidth = DESKTOP_WIDTH;
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    get matches() {
      return viewportWidth <= maxWidthOf(query);
    },
    media: query,
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type BellHarnessProps = {
  items: readonly NotificationBellItem[];
  onOpenItem?: (id: string) => void;
};

function BellHarness(props: BellHarnessProps) {
  const { onOpenItem = () => {} } = props;
  const [items, setItems] = useState(props.items);
  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <NotificationBell
      items={items}
      onMarkAllRead={() =>
        setItems((current) =>
          current.map((item) => ({ ...item, unread: false })),
        )
      }
      onOpenItem={onOpenItem}
      unreadCount={unreadCount}
    />
  );
}

function renderBell(props: BellHarnessProps) {
  return render(
    <MotionConfig reducedMotion="always">
      <MemoryRouter initialEntries={["/coach"]}>
        <BellHarness {...props} />
        <Routes>
          <Route element={<p>Dashboard</p>} path="/coach" />
          <Route element={<h1>Check-ins</h1>} path="/coach/checkins" />
        </Routes>
      </MemoryRouter>
    </MotionConfig>,
  );
}

function bellTrigger(): HTMLElement {
  return screen.getByRole("button", { name: /^Notifications/ });
}

async function openBell(): Promise<HTMLElement> {
  await userEvent.click(bellTrigger());

  return screen.findByRole("dialog", { name: "Notifications" });
}

describe("the notification bell's trigger", () => {
  it("names how many notifications wait unread and marks itself with the dot", () => {
    // arrange, act
    renderBell({ items: [REQUESTED, EXPIRED, APPROVED] });

    // assert
    expect(bellTrigger()).toHaveAccessibleName("Notifications, 2 unread");
    expect(
      bellTrigger().querySelector('[data-parity="attention-dot"]'),
    ).toBeInTheDocument();
  });

  it("is plainly Notifications, without the dot, when nothing is unread", () => {
    // arrange, act
    renderBell({ items: [APPROVED] });

    // assert
    expect(bellTrigger()).toHaveAccessibleName("Notifications");
    expect(
      bellTrigger().querySelector('[data-parity="attention-dot"]'),
    ).not.toBeInTheDocument();
  });
});

describe("the notification bell's list", () => {
  it("opens as a popover on wider screens, each row its title, line and how long ago, unread ones marked", async () => {
    // arrange
    renderBell({ items: [REQUESTED, APPROVED] });

    // act
    const bell = await openBell();

    // assert
    expect(bellTrigger()).toHaveAttribute("aria-expanded", "true");
    expect(
      within(bell).getByRole("heading", { name: "Notifications" }),
    ).toBeInTheDocument();
    const rows = within(bell).getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(
      `Unread: ${REQUESTED.title}${REQUESTED.line}${REQUESTED.ago}`,
    );
    expect(rows[0]).toHaveAttribute("href", REQUESTED.href);
    expect(rows[1]).toHaveTextContent(
      `${APPROVED.title}${APPROVED.line}${APPROVED.ago}`,
    );
    expect(rows[1]).not.toHaveTextContent(/Unread/);
    expect(
      rows[0].querySelector('[data-parity="attention-dot"]'),
    ).toBeInTheDocument();
    expect(
      rows[1].querySelector('[data-parity="attention-dot"]'),
    ).not.toBeInTheDocument();
  });

  it("opens as a sheet titled Notifications on a phone", async () => {
    // arrange
    viewportWidth = PHONE_WIDTH;
    renderBell({ items: [REQUESTED] });

    // act
    const sheet = await openBell();

    // assert
    expect(sheet).not.toHaveAttribute("aria-label");
    expect(
      screen.getByRole("button", { hidden: true, name: /^Notifications/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(sheet).getByRole("button", { name: "Mark all read" }),
    ).toBeInTheDocument();
    expect(within(sheet).getByRole("link")).toHaveAttribute(
      "href",
      REQUESTED.href,
    );
  });

  it("says so when nothing arrived yet, without Mark all read", async () => {
    // arrange
    renderBell({ items: [] });

    // act
    const bell = await openBell();

    // assert
    expect(within(bell).getByText("No notifications yet.")).toBeInTheDocument();
    expect(
      within(bell).queryByRole("button", { name: "Mark all read" }),
    ).not.toBeInTheDocument();
  });

  it("offers Mark all read only while something is unread, and keeps focus in the list on its heading", async () => {
    // arrange
    renderBell({ items: [REQUESTED, EXPIRED] });
    const bell = await openBell();

    // act
    await userEvent.click(
      within(bell).getByRole("button", { name: "Mark all read" }),
    );

    // assert
    expect(bellTrigger()).toHaveAccessibleName("Notifications");
    expect(
      within(bell).queryByRole("button", { name: "Mark all read" }),
    ).not.toBeInTheDocument();
    expect(within(bell).queryByText(/^Unread/)).not.toBeInTheDocument();
    expect(
      within(bell).getByRole("heading", { name: "Notifications" }),
    ).toHaveFocus();
  });

  it("opens a row, closing the list without taking focus back to the bell", async () => {
    // arrange
    const onOpenItem = vi.fn();
    renderBell({ items: [REQUESTED, EXPIRED], onOpenItem });
    const bell = await openBell();

    // act
    await userEvent.click(
      within(bell).getByRole("link", { name: /Check-in request expired/ }),
    );

    // assert
    expect(onOpenItem).toHaveBeenCalledWith(EXPIRED.id);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Notifications" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Check-ins" }),
    ).toBeInTheDocument();
    expect(bellTrigger()).not.toHaveFocus();
  });

  it("returns focus to the bell when the list closes without opening a row", async () => {
    // arrange
    renderBell({ items: [REQUESTED] });
    await openBell();

    // act
    await userEvent.keyboard("{Escape}");

    // assert
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Notifications" }),
      ).not.toBeInTheDocument(),
    );
    expect(bellTrigger()).toHaveFocus();
  });

  it("returns focus to the bell when the phone sheet closes without opening a row", async () => {
    // arrange
    viewportWidth = PHONE_WIDTH;
    renderBell({ items: [REQUESTED] });
    await openBell();

    // act
    await userEvent.keyboard("{Escape}");

    // assert
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Notifications" }),
      ).not.toBeInTheDocument(),
    );
    expect(bellTrigger()).toHaveFocus();
  });

  it("passes the axe checks while open", async () => {
    // arrange
    const { baseElement } = renderBell({ items: [REQUESTED, APPROVED] });
    await openBell();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
