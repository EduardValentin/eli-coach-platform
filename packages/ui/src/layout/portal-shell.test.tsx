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
import {
  Activity,
  Calendar,
  CalendarCheck,
  Droplet,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Link, MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { MAIN_CONTENT_ID } from "../lib/constants";
import { PortalShell, type PortalNavigationLink } from "./portal-shell";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

const portalLinks = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach/clients", label: "Clients", icon: Users },
] as const;

type ShellOptions = {
  initialPath?: string;
  reducedMotion?: "always" | "never";
  topBarActions?: ReactNode;
};

function renderShell(options: ShellOptions = {}) {
  const {
    initialPath = "/coach",
    reducedMotion = "always",
    topBarActions,
  } = options;

  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PortalShell
          asideLabel="Coach portal sidebar"
          brand={<p>Evoa</p>}
          links={portalLinks}
          mobileNavigation={{
            kind: "drawer",
            label: "Coach portal mobile navigation",
          }}
          navigationLabel="Coach portal navigation"
          topBarActions={topBarActions}
          topBarBrand={<p>Coach Portal</p>}
          topBarLabel="Coach portal top bar"
        >
          <div>Coach content</div>
        </PortalShell>
      </MemoryRouter>
    </MotionConfig>,
  );
}

function queryMobileNavigation() {
  return screen.queryByRole("dialog", {
    name: "Coach portal mobile navigation",
  });
}

const clientLinks = [
  { href: "/client", label: "Dashboard", icon: Activity },
  { href: "/client/checkins", label: "Check-ins", icon: CalendarCheck },
  { href: "/client/profile", label: "Profile", icon: UserCircle },
  { href: "/client/plan", label: "My Plan", icon: Calendar },
  { href: "/client/messages", label: "Messages", icon: MessageSquare },
  { href: "/client/cycle", label: "Cycle", icon: Droplet },
  { href: "/client/settings", label: "Settings", icon: Settings },
] as const;

type ClientShellOptions = {
  initialPath?: string;
  links?: readonly PortalNavigationLink[];
  reducedMotion?: "always" | "never";
  tabs?: readonly PortalNavigationLink[];
};

function renderClientShell(options: ClientShellOptions = {}) {
  const {
    initialPath = "/client",
    links = clientLinks,
    reducedMotion = "always",
    tabs = clientLinks.slice(0, 5),
  } = options;

  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PortalShell
          asideLabel="Client portal sidebar"
          brand={<p>Sidebar name block</p>}
          links={links}
          mobileNavigation={{
            kind: "tabs",
            sheet: {
              footer: <button type="button">Sign out</button>,
              header: (closeSheet) => (
                <Link onClick={closeSheet} to="/client/profile">
                  Sheet name block
                </Link>
              ),
              navigationLabel: "Client portal more",
              title: "More",
            },
            tabs,
            tabsLabel: "Client portal tabs",
          }}
          navigationLabel="Client portal navigation"
          topBarBrand={<p>Top bar name block</p>}
          topBarLabel="Client portal top bar"
        >
          <div>Client content</div>
        </PortalShell>
      </MemoryRouter>
    </MotionConfig>,
  );
}

function getMoreButton() {
  return screen.getByRole("button", { name: "More" });
}

async function openMoreSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getMoreButton());

  return screen.findByRole("dialog", { name: "More" });
}

async function openMobileMenu(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole("button", { name: "Open menu" });
  toggle.focus();
  await user.keyboard("{Enter}");

  return screen.findByRole("dialog", {
    name: "Coach portal mobile navigation",
  });
}

describe("PortalShell landmarks", () => {
  it("renders a labeled sidebar, labeled navigation, the main landmark, and a skip link", () => {
    // arrange, act
    renderShell();

    // assert
    expect(
      screen.getByRole("complementary", { name: "Coach portal sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Coach portal navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("banner", { name: "Coach portal top bar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
  });

  it("renders the brand blocks and the page content", () => {
    // arrange, act
    renderShell();

    // assert
    expect(screen.getByText("Evoa")).toBeInTheDocument();
    expect(screen.getByText("Coach Portal")).toBeInTheDocument();
    expect(screen.getByText("Coach content")).toBeInTheDocument();
  });
});

describe("PortalShell active link", () => {
  it("marks the link matching the current path as the current page", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Clients" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks only the longest matching link on a nested path", () => {
    // arrange, act
    renderShell({ initialPath: "/coach/clients/42" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Clients" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("PortalShell navigation link styling", () => {
  it("leaves the link's own typography to the label it wraps", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });
    const link = within(sidebar).getByRole("link", { name: "Dashboard" });

    expect(link).not.toHaveClass("text-sm");
    expect(link).not.toHaveClass("font-medium");
    expect(within(link).getByText("Dashboard")).toHaveClass(
      "text-sm",
      "font-medium",
    );
  });

  it("tints the current page's link with the portal's interaction colour", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).toHaveClass("bg-primary-soft", "text-primary");
  });

  it("thickens the current page's icon stroke and leaves the others regular", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });
    const currentIcon = within(sidebar)
      .getByRole("link", { name: "Dashboard" })
      .querySelector("svg");
    const otherIcon = within(sidebar)
      .getByRole("link", { name: "Clients" })
      .querySelector("svg");

    expect(currentIcon).toHaveAttribute("stroke-width", "2.5");
    expect(otherIcon).toHaveAttribute("stroke-width", "2");
  });
});

describe("PortalShell content width", () => {
  it("caps its content at the width both portals share", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const main = screen.getByRole("main");

    expect(main.firstElementChild).toHaveClass("max-w-portal");
  });
});

describe("PortalShell mobile menu", () => {
  it("opens through the keyboard-operable toggle and moves focus into the menu", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    // act
    const menu = await openMobileMenu(user);

    // assert
    expect(
      within(menu).getByRole("navigation", {
        name: "Coach portal navigation",
      }),
    ).toBeInTheDocument();
    expect(within(menu).queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      within(menu).getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it("leaves the top bar's brand as the only one while the drawer is open", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();

    // act
    const menu = await openMobileMenu(user);

    // assert
    expect(within(menu).getByText("Coach Portal")).toBeInTheDocument();
    expect(within(menu).queryByText("Evoa")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    await openMobileMenu(user);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(queryMobileNavigation()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("closes when the viewport crosses the desktop breakpoint and focuses the main content", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    const menuTrigger = screen.getByRole("button", { name: "Open menu" });
    await openMobileMenu(user);

    // act
    menuTrigger.style.display = "none";
    window.dispatchEvent(new Event("resize"));

    // assert
    await waitFor(() => {
      expect(queryMobileNavigation()).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus();
    });
  });

  it("keeps Tab cycling between the open menu and the toggle", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    const menu = await openMobileMenu(user);
    const toggle = screen.getByRole("button", { name: "Close menu" });

    // act, assert — a full lap of Tab presses never leaves the reachable set
    for (let press = 0; press < 6; press += 1) {
      await user.tab();
      const active = document.activeElement;
      expect(menu.contains(active) || active === toggle).toBe(true);
    }
  });

  it("returns focus to the toggle once the drawer finishes closing", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell({ reducedMotion: "never" });
    await openMobileMenu(user);

    // act
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    // assert
    await waitFor(() => {
      expect(queryMobileNavigation()).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("closes immediately when a top-bar action runs from the open menu", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell({
      reducedMotion: "never",
      topBarActions: <button type="button">Notifications</button>,
    });
    const menu = await openMobileMenu(user);

    // act
    await user.click(
      within(menu).getByRole("button", { name: "Notifications" }),
    );

    // assert
    expect(queryMobileNavigation()).not.toBeInTheDocument();
  });

  it("closes when a navigation link inside the menu is activated", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    const menu = await openMobileMenu(user);

    // act
    await user.click(within(menu).getByRole("link", { name: "Clients" }));

    // assert
    expect(queryMobileNavigation()).not.toBeInTheDocument();
  });
});

describe("PortalShell accessibility", () => {
  it("has no obvious axe violations with the menu closed", async () => {
    // arrange
    const { baseElement } = renderShell();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious axe violations with the menu open", async () => {
    // arrange
    const user = userEvent.setup();
    const { baseElement } = renderShell();
    await openMobileMenu(user);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("PortalShell tab navigation", () => {
  it("renders a labeled top bar, tab bar, sidebar and navigation without a menu toggle", () => {
    // arrange, act
    renderClientShell();

    // assert
    expect(
      screen.getByRole("banner", { name: "Client portal top bar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal tabs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Client portal sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open menu" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Top bar name block")).toBeInTheDocument();
    expect(screen.getByText("Client content")).toBeInTheDocument();
  });

  it("puts at most four tabs on the bar, followed by More", () => {
    // arrange, act
    renderClientShell();

    // assert
    const tabBar = screen.getByRole("navigation", {
      name: "Client portal tabs",
    });
    const tabs = within(tabBar).getAllByRole("link");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Dashboard",
      "Check-ins",
      "Profile",
      "My Plan",
    ]);
    expect(within(tabBar).getByRole("button", { name: "More" })).toBeVisible();
  });

  it("marks the current page's tab and tints it with the portal's interaction colour", () => {
    // arrange, act
    renderClientShell({ initialPath: "/client/checkins" });

    // assert
    const tabBar = screen.getByRole("navigation", {
      name: "Client portal tabs",
    });
    const currentTab = within(tabBar).getByRole("link", { name: "Check-ins" });

    expect(currentTab).toHaveAttribute("aria-current", "page");
    expect(currentTab).toHaveClass("bg-primary-soft", "text-primary");
    expect(
      within(tabBar).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("lists every link left off the bar in the sheet", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();

    // act
    const sheet = await openMoreSheet(user);

    // assert
    const sheetNavigation = within(sheet).getByRole("navigation", {
      name: "Client portal more",
    });

    expect(
      within(sheetNavigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Messages", "Cycle", "Settings"]);
  });

  it("renders the sheet with its header and footer but no navigation when every link is on the bar", async () => {
    // arrange
    const user = userEvent.setup();
    const dashboardOnly = clientLinks.slice(0, 1);
    renderClientShell({ links: dashboardOnly, tabs: dashboardOnly });

    // act
    const sheet = await openMoreSheet(user);

    // assert
    expect(within(sheet).queryByRole("navigation")).not.toBeInTheDocument();
    expect(within(sheet).getByText("Sheet name block")).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("shows More collapsed while the sheet is closed", () => {
    // arrange, act
    renderClientShell();

    // assert
    expect(getMoreButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("expands More and points it at the open sheet", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();

    // act
    const sheet = await openMoreSheet(user);

    // assert
    const moreBehindTheSheet = screen.getByRole("button", {
      hidden: true,
      name: "More",
    });

    expect(moreBehindTheSheet).toHaveAttribute("aria-expanded", "true");
    expect(moreBehindTheSheet).toHaveAttribute("aria-controls", sheet.id);
  });

  it("marks More active while a sheet link is the current page", () => {
    // arrange, act
    renderClientShell({ initialPath: "/client/cycle" });

    // assert
    expect(getMoreButton()).toHaveClass("bg-primary-soft", "text-primary");
  });

  it("marks the current page's link inside the sheet", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell({ initialPath: "/client/cycle" });

    // act
    const sheet = await openMoreSheet(user);

    // assert
    expect(within(sheet).getByRole("link", { name: "Cycle" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("closes the sheet on Escape and returns focus to More", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();
    await openMoreSheet(user);

    // act
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(getMoreButton()).toHaveFocus();
    expect(getMoreButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the sheet when one of its links is activated", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();
    const sheet = await openMoreSheet(user);

    // act
    await user.click(within(sheet).getByRole("link", { name: "Cycle" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the sheet when a link in its header is followed", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();
    const sheet = await openMoreSheet(user);

    // act
    await user.click(
      within(sheet).getByRole("link", { name: "Sheet name block" }),
    );

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the sheet when the viewport crosses the desktop breakpoint and focuses the main content", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell();
    const tabBar = screen.getByRole("navigation", {
      name: "Client portal tabs",
    });
    await openMoreSheet(user);

    // act
    tabBar.style.display = "none";
    window.dispatchEvent(new Event("resize"));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus();
    });
  });

  it("renders the sheet in place under reduced motion", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientShell({ reducedMotion: "always" });

    // act
    const sheet = await openMoreSheet(user);

    // assert
    expect(sheet.style.transform).toBe("");
  });
});

describe("PortalShell tab navigation accessibility", () => {
  it("has no obvious axe violations with the sheet closed", async () => {
    // arrange
    const { baseElement } = renderClientShell();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious axe violations with the sheet open", async () => {
    // arrange
    const user = userEvent.setup();
    const { baseElement } = renderClientShell();
    await openMoreSheet(user);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
