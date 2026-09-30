// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { SignOutButton } from "@clerk/react-router";
import { toast } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react-router", () => ({
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import type { ClientShellPresentation } from "./client-identity-presentation";
import ClientLayoutRoute, { meta } from "./layout";

const ANA: ClientShellPresentation = {
  displayName: "Ana Popescu",
  greeting: "Welcome back, Ana.",
};

function ProfilePage() {
  return (
    <button onClick={() => toast.success("Measurements saved.")} type="button">
      Save measurements
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderClientLayout(
  presentation: ClientShellPresentation = ANA,
  entry = "/client",
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        { Component: () => <p>Dashboard page</p>, index: true },
        { Component: ProfilePage, path: "profile" },
      ],
      Component: ClientLayoutRoute,
      loader: () => presentation,
      path: "/client",
    },
  ]);

  return render(
    <MotionConfig reducedMotion="always">
      <RoutesStub initialEntries={[entry]} />
    </MotionConfig>,
  );
}

describe("ClientLayoutRoute", () => {
  it("labels every landmark of the client shell", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    expect(
      await screen.findByRole("complementary", {
        name: "Client portal sidebar",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("banner", { name: "Client portal top bar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal tabs" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard page");
  });

  it("lists the dashboard and her profile, marking the dashboard as the page being read", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Profile",
    ]);
    expect(links[0]).toHaveAttribute("href", "/client");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveAttribute("href", "/client/profile");
    expect(links[1]).not.toHaveAttribute("aria-current");
  });

  it("puts the dashboard and her profile in the tab bar", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const tabs = await screen.findByRole("navigation", {
      name: "Client portal tabs",
    });

    expect(
      within(tabs).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/client/profile",
    );
  });

  it("marks her profile as the page being read on the profile page", async () => {
    // arrange, act
    renderClientLayout(ANA, "/client/profile");

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });

    expect(
      within(navigation).getByRole("link", { name: "Profile" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("names the client in the sidebar and the top bar", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });
    const topBar = screen.getByRole("banner", {
      name: "Client portal top bar",
    });

    expect(within(sidebar).getByText("Ana Popescu")).toBeInTheDocument();
    expect(within(topBar).getByText("Ana Popescu")).toBeInTheDocument();
  });

  it("names an account with no client record plainly as Client", async () => {
    // arrange, act
    renderClientLayout({ displayName: "Client", greeting: "Welcome back." });

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });

    expect(within(sidebar).getByText("Client")).toBeInTheDocument();
  });

  it("links her name to her profile in the sidebar and the top bar", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });
    const topBar = screen.getByRole("banner", {
      name: "Client portal top bar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Ana Popescu" }),
    ).toHaveAttribute("href", "/client/profile");
    expect(
      within(topBar).getByRole("link", { name: "Ana Popescu" }),
    ).toHaveAttribute("href", "/client/profile");
  });

  it("closes the More sheet when she follows her name to her profile", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout();
    await user.click(await screen.findByRole("button", { name: "More" }));
    const sheet = await screen.findByRole("dialog", { name: "More" });

    // act
    await user.click(within(sheet).getByRole("link", { name: "Ana Popescu" }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "More" }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole("button", { name: "Save measurements" }),
    ).toBeInTheDocument();
  });

  it("carries no notification bell and no way back to the public site", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    await screen.findByRole("complementary", { name: "Client portal sidebar" });
    expect(
      screen.queryByRole("button", { name: /notification/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Public Site" }),
    ).not.toBeInTheDocument();
  });

  it("opens the More sheet with her name and a way to sign out to the public home", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout();

    // act
    await user.click(await screen.findByRole("button", { name: "More" }));

    // assert
    const sheet = await screen.findByRole("dialog", { name: "More" });

    expect(within(sheet).getByText("Ana Popescu")).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Sign out" }),
    ).toBeEnabled();
    expect(
      within(sheet).queryByRole("navigation", { name: "Client portal more" }),
    ).not.toBeInTheDocument();
    expect(vi.mocked(SignOutButton)).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: "/" }),
      undefined,
    );
  });

  it("shows the outcome a page reports as a toast", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout(ANA, "/client/profile");

    // act
    await user.click(
      await screen.findByRole("button", { name: "Save measurements" }),
    );

    // assert
    expect(await screen.findByText("Measurements saved.")).toBeInTheDocument();
  });

  it("titles the installed client portal Evoa", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([
      { title: "Evoa" },
      {
        name: "description",
        content: "Your coaching home: your program, check-ins and progress.",
      },
      { name: "theme-color", content: "#ffffff" },
    ]);
  });
});
