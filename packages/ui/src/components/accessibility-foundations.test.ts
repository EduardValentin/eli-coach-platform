import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { getAnnouncementText, getHeadingHierarchyIssues, MAIN_CONTENT_ID } from "./accessibility-manager";
import { MarketingSurfaceLayout, SidebarSurfaceLayout } from "./surface-layout";

describe("accessibility foundations", () => {
  it("derives concise route announcements from document titles", () => {
    expect(getAnnouncementText("Blog | Eli Coach Platform", "Editorial foundation")).toBe("Blog");
    expect(getAnnouncementText("", "Editorial foundation")).toBe("Editorial foundation");
  });

  it("flags missing h1 elements and heading level skips", () => {
    expect(getHeadingHierarchyIssues([2, 3])).toEqual([
      "Expected exactly one h1, found 0.",
      "Expected the first heading to be h1, found h2.",
    ]);

    expect(getHeadingHierarchyIssues([1, 3])).toEqual(["Heading levels skip from h1 to h3."]);
  });

  it("renders the marketing surface landmarks and skip link", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          MarketingSurfaceLayout,
          {
            description: "Accessible public marketing layout.",
            eyebrow: "Public Surface",
            links: [{ href: "/", label: "Home" }],
            navigationLabel: "Public site navigation",
            title: "Eli Coach Platform",
          },
          React.createElement("div", null, "Marketing content"),
        ),
      ),
    );

    expect(html).toContain(`href="#${MAIN_CONTENT_ID}"`);
    expect(html).toContain('aria-label="Public site navigation"');
    expect(html).toContain(`<main id="${MAIN_CONTENT_ID}"`);
  });

  it("renders the sidebar layout with labeled aside and navigation landmarks", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          SidebarSurfaceLayout,
          {
            asideLabel: "Client portal sidebar",
            description: "Accessible client layout.",
            eyebrow: "Client Portal",
            links: [{ href: "/client", label: "Dashboard" }],
            navigationLabel: "Client portal navigation",
            title: "Eli Client Portal",
          },
          React.createElement("div", null, "Client content"),
        ),
      ),
    );

    expect(html).toContain('aria-label="Client portal sidebar"');
    expect(html).toContain('aria-label="Client portal navigation"');
    expect(html).toContain(`<main id="${MAIN_CONTENT_ID}"`);
  });

  it("marks the page heading as the route focus fallback", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AppShell,
        {
          description: "Page description",
          eyebrow: "Client Portal",
          title: "Client-facing app shell",
        },
        React.createElement("div", null, "Page content"),
      ),
    );

    expect(html).toContain('data-page-heading="true"');
    expect(html).toContain('tabindex="-1"');
  });
});
