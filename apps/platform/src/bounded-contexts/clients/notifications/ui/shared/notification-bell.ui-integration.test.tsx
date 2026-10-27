// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { NotificationBell } from "~/shared/design-system/layout";
import { toast, Toaster } from "~/shared/design-system/toast";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLoaderData,
  useLocation,
} from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { clientLoader as bellLoader } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/bell";
import { clientAction as markAllRead } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/read-all";
import { clientAction as markRead } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/read";
import type {
  NotificationBellReply,
  NotificationDescriber,
  NotificationReply,
} from "~/bounded-contexts/clients/notifications/public/notifications";
import { NOTIFICATIONS_API_PATHS } from "~/bounded-contexts/clients/notifications/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/composition-root/test-support/framework-mode-action";

import { useNotificationBell } from "./notification-bell";

const MINUTE_MS = 60_000;
const LOADED_AT = "2026-10-15T12:00:00.000Z";
const CHECKED_AT = "2026-10-15T12:01:00.000Z";

const REQUESTED: NotificationReply = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "test.requested",
  facts: { name: "Jane Doe" },
  arrivedAt: "2026-10-15T11:55:00.000Z",
  unread: true,
};

const ARRIVED: NotificationReply = {
  id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  kind: "test.requested",
  facts: { name: "Maria Popescu" },
  arrivedAt: "2026-10-15T12:00:30.000Z",
  unread: true,
};

const UNWORDED: NotificationReply = {
  id: "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  kind: "test.unknown",
  facts: {},
  arrivedAt: "2026-10-15T11:00:00.000Z",
  unread: true,
};

const ignoreEverything: NotificationDescriber = () => null;

const describeTestNotification: NotificationDescriber = (
  notification,
  reading,
) =>
  notification.kind === "test.requested"
    ? {
        title: "Check-in requested",
        line: `${String(notification.facts.name)} asked ${reading.party} for a check-in.`,
        href: `/coach/checkins?checkin=${notification.id}`,
      }
    : null;

const server = setupServer();

let shellBell: NotificationBellReply;
let bellReads: number;
let readIds: string[];
let readAllCount: number;

function bellOf(
  notifications: readonly NotificationReply[],
  checkedAt: string,
): NotificationBellReply {
  return {
    notifications: [...notifications],
    unreadCount: notifications.filter((notification) => notification.unread)
      .length,
    checkedAt,
  };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches: query.includes("min-width"),
      media: query,
      removeEventListener: vi.fn(),
    })),
  );
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });
  shellBell = bellOf([REQUESTED], LOADED_AT);
  bellReads = 0;
  readIds = [];
  readAllCount = 0;
  server.use(
    http.get(`*${NOTIFICATIONS_API_PATHS.bell}`, () => {
      bellReads += 1;
      return HttpResponse.json(bellOf([ARRIVED, REQUESTED], CHECKED_AT));
    }),
    http.post(`*${NOTIFICATIONS_API_PATHS.readAll}`, () => {
      readAllCount += 1;
      shellBell = bellOf(
        shellBell.notifications.map((notification) => ({
          ...notification,
          unread: false,
        })),
        CHECKED_AT,
      );
      return HttpResponse.json({ status: "marked" });
    }),
    http.post(`*${NOTIFICATIONS_API_PATHS.read}`, ({ params }) => {
      readIds.push(String(params.notificationId));
      return HttpResponse.json({ status: "marked" });
    }),
  );
});

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

function CoachShell(props: { describers: readonly NotificationDescriber[] }) {
  const bell = useLoaderData<NotificationBellReply>();
  const binding = useNotificationBell({
    bell,
    describers: props.describers,
    party: "coach",
  });

  return (
    <>
      <NotificationBell {...binding} />
      <Outlet />
    </>
  );
}

function CheckInsPage() {
  const { search } = useLocation();

  return <h1>Check-ins {search}</h1>;
}

async function renderShell(
  describers: readonly NotificationDescriber[] = [
    ignoreEverything,
    describeTestNotification,
  ],
) {
  const router = createMemoryRouter(
    [
      {
        children: [
          { element: <p>Dashboard</p>, index: true },
          { element: <CheckInsPage />, path: "checkins" },
        ],
        element: <CoachShell describers={describers} />,
        loader: () => shellBell,
        path: "/coach",
      },
      {
        loader: frameworkModeLoader(bellLoader),
        path: NOTIFICATIONS_API_PATHS.bell,
        shouldRevalidate: () => false,
      },
      {
        action: frameworkModeAction(markRead),
        path: NOTIFICATIONS_API_PATHS.read,
      },
      {
        action: frameworkModeAction(markAllRead),
        path: NOTIFICATIONS_API_PATHS.readAll,
      },
    ],
    { initialEntries: ["/coach"] },
  );
  render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByText("Dashboard");

  return router;
}

function bellTrigger(): HTMLElement {
  return screen.getByRole("button", { name: /^Notifications/ });
}

async function waitAMinute() {
  await act(async () => {
    vi.advanceTimersByTime(MINUTE_MS);
  });
}

function arrivalToast(): Promise<HTMLElement> {
  return screen
    .findByText("Maria Popescu asked coach for a check-in.")
    .then((line) => {
      const item = line.closest("li");
      if (!item) throw new Error("No toast holds the line");
      return item;
    });
}

describe("the bell a shell loads", () => {
  it("lights the bell for what was already there, without toasts or a check", async () => {
    // arrange, act
    await renderShell();

    // assert
    expect(bellTrigger()).toHaveAccessibleName("Notifications, 1 unread");
    expect(document.querySelector("[data-sonner-toast]")).toBeNull();
    expect(bellReads).toBe(0);
  });

  it("lists what a describer words, newest first, with how long ago against the check", async () => {
    // arrange
    shellBell = bellOf([REQUESTED, UNWORDED], LOADED_AT);
    await renderShell();

    // act
    await userEvent.click(bellTrigger());

    // assert
    const bell = await screen.findByRole("dialog", { name: "Notifications" });
    const rows = within(bell).getAllByRole("link");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Jane Doe asked coach for a check-in.");
    expect(rows[0]).toHaveTextContent("5 min ago");
    expect(rows[0]).toHaveAttribute(
      "href",
      `/coach/checkins?checkin=${REQUESTED.id}`,
    );
  });
});

describe("the minute check", () => {
  it("shows a toast with View for each notification that arrived since, and lights the bell", async () => {
    // arrange
    await renderShell();

    // act
    await waitAMinute();

    // assert
    const arrival = await arrivalToast();
    expect(within(arrival).getByText("Check-in requested")).toBeInTheDocument();
    expect(
      within(arrival).getByRole("button", { name: "View" }),
    ).toBeInTheDocument();
    expect(bellReads).toBe(1);
    await waitFor(() =>
      expect(bellTrigger()).toHaveAccessibleName("Notifications, 2 unread"),
    );
    expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
  });

  it("pauses while the page is hidden and checks at once when it shows again", async () => {
    // arrange
    await renderShell();
    setVisibility("hidden");

    // act
    await act(async () => {
      vi.advanceTimersByTime(3 * MINUTE_MS);
    });
    const readsWhileHidden = bellReads;
    setVisibility("visible");

    // assert
    expect(readsWhileHidden).toBe(0);
    await arrivalToast();
    expect(bellReads).toBe(1);
  });

  it("opens the notification from the toast's View and marks it read", async () => {
    // arrange
    const router = await renderShell();
    await waitAMinute();
    const arrival = await arrivalToast();

    // act
    await userEvent.click(
      within(arrival).getByRole("button", { name: "View" }),
    );

    // assert
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/coach/checkins"),
    );
    expect(router.state.location.search).toBe(`?checkin=${ARRIVED.id}`);
    await waitFor(() => expect(readIds).toEqual([ARRIVED.id]));
    expect(bellTrigger()).toHaveAccessibleName("Notifications, 1 unread");
  });
});

describe("reading notifications", () => {
  it("marks a row read as it opens it", async () => {
    // arrange
    const router = await renderShell();
    await userEvent.click(bellTrigger());
    const bell = await screen.findByRole("dialog", { name: "Notifications" });

    // act
    await userEvent.click(within(bell).getByRole("link"));

    // assert
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/coach/checkins"),
    );
    await waitFor(() => expect(readIds).toEqual([REQUESTED.id]));
    expect(bellTrigger()).toHaveAccessibleName("Notifications");
  });

  it("marks everything read through one request", async () => {
    // arrange
    await renderShell();
    await userEvent.click(bellTrigger());
    const bell = await screen.findByRole("dialog", { name: "Notifications" });

    // act
    await userEvent.click(
      within(bell).getByRole("button", { name: "Mark all read" }),
    );

    // assert
    expect(bellTrigger()).toHaveAccessibleName("Notifications");
    await waitFor(() => expect(readAllCount).toBe(1));
  });
});
