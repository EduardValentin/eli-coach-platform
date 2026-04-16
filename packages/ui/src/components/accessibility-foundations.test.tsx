// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { AppShell, Panel } from "./app-shell";
import { getAnnouncementText, MAIN_CONTENT_ID } from "./accessibility-manager";
import { MarketingSurfaceLayout, SidebarSurfaceLayout } from "./surface-layout";

afterEach(() => {
  cleanup();
});

describe("accessibility foundations", () => {
  it("derives concise route announcements from document titles", () => {
    expect(getAnnouncementText("Blog | Eli Coach Platform", "Editorial foundation")).toBe("Blog");
    expect(getAnnouncementText("", "Editorial foundation")).toBe("Editorial foundation");
  });

  it("renders the marketing surface landmarks and skip link", () => {
    render(
      <MemoryRouter>
        <MarketingSurfaceLayout
          description="Accessible public marketing layout."
          eyebrow="Public Surface"
          links={[{ href: "/", label: "Home" }]}
          navigationLabel="Public site navigation"
          title="Eli Coach Platform"
        >
          <div>Marketing content</div>
        </MarketingSurfaceLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      `#${MAIN_CONTENT_ID}`,
    );
    expect(screen.getByRole("navigation", { name: "Public site navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });

  it("renders the sidebar layout with labeled aside and navigation landmarks", () => {
    render(
      <MemoryRouter>
        <SidebarSurfaceLayout
          asideLabel="Client portal sidebar"
          description="Accessible client layout."
          eyebrow="Client Portal"
          links={[{ href: "/client", label: "Dashboard" }]}
          navigationLabel="Client portal navigation"
          title="Eli Client Portal"
        >
          <div>Client content</div>
        </SidebarSurfaceLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("complementary", { name: "Client portal sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Client portal navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });

  it("renders a single h1 and nested h2 headings in the page shell", () => {
    render(
      <AppShell description="Page description" eyebrow="Client Portal" title="Client-facing app shell">
        <Panel description="Panel description" title="Panel title">
          <div>Panel content</div>
        </Panel>
      </AppShell>,
    );

    const levelOneHeadings = screen.getAllByRole("heading", { level: 1 });

    expect(levelOneHeadings).toHaveLength(1);
    expect(levelOneHeadings[0]).toHaveAttribute("data-page-heading", "true");
    expect(levelOneHeadings[0]).toHaveAttribute("tabindex", "-1");

    expect(screen.getByRole("heading", { level: 2, name: "Panel title" })).toBeInTheDocument();
    expect(screen.getByText("Panel description")).toBeInTheDocument();

    const allHeadings = screen.getAllByRole("heading");

    expect(allHeadings.map((heading) => Number(heading.tagName.slice(1)))).toEqual([1, 2]);
    expect(
      within(screen.getByText("Panel title").parentElement as HTMLElement).getByText("Panel description"),
    ).toBeInTheDocument();
  });
});
