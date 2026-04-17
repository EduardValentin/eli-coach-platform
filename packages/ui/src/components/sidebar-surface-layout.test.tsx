// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { SidebarSurfaceLayout } from "./sidebar-surface-layout";
import { MAIN_CONTENT_ID } from "./surface-layout.shared";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

async function expectNoAxeViolations(baseElement: HTMLElement) {
  const results = await axe(baseElement);

  expect(results.violations).toEqual([]);
}

describe("SidebarSurfaceLayout", () => {
  it("renders a labeled aside, labeled navigation, and the main content landmark", () => {
    render(
      <MemoryRouter>
        <SidebarSurfaceLayout
          asideLabel="Client portal sidebar"
          links={[{ href: "/client", label: "Dashboard" }]}
          navigationLabel="Client portal navigation"
          title="Client Portal"
        >
          <div>Client content</div>
        </SidebarSurfaceLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("complementary", { name: "Client portal sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Client portal navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });
});

describe("SidebarSurfaceLayout accessibility", () => {
  it("has no obvious axe violations", async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <SidebarSurfaceLayout
          asideLabel="Coach portal sidebar"
          links={[{ href: "/coach", label: "Workspace" }]}
          navigationLabel="Coach portal navigation"
          title="Coach Portal"
        >
          <div>Coach content</div>
        </SidebarSurfaceLayout>
      </MemoryRouter>,
    );

    await expectNoAxeViolations(baseElement);
  });
});
