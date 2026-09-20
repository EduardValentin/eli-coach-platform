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
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { MAIN_CONTENT_ID } from "../lib/constants";
import { PortalShell } from "./portal-shell";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

const portalLinks = [
  { href: "/coach", label: "Dashboard", icon: <span aria-hidden="true" /> },
  {
    href: "/coach/clients",
    label: "Clients",
    icon: <span aria-hidden="true" />,
  },
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
          mobileNavigationLabel="Coach portal mobile navigation"
          navigationLabel="Coach portal navigation"
          topBarActions={topBarActions}
          topBarBrand={<p>Coach Portal</p>}
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
    expect(link).not.toHaveClass("font-semibold");
    expect(within(link).getByText("Dashboard")).toHaveClass(
      "text-sm",
      "font-semibold",
    );
  });

  it("lifts the current page's link on the inverted fill", () => {
    // arrange, act
    renderShell({ initialPath: "/coach" });

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).toHaveClass("bg-text-primary", "text-text-inverted", "shadow-action");
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
