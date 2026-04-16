// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { AppShell, Panel } from "./app-shell";
import { MarketingSurfaceLayout, SidebarSurfaceLayout } from "./surface-layout";

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

function DemoPageShell(props: { description: string; eyebrow: string; title: string }) {
  const { description, eyebrow, title } = props;

  return (
    <AppShell description={description} eyebrow={eyebrow} title={title}>
      <Panel description="A durable accessibility baseline for every surface." title="Foundation">
        <p>Shared landmarks, headings, and route semantics stay testable here.</p>
      </Panel>
    </AppShell>
  );
}

describe("accessibility foundations axe coverage", () => {
  it("has no obvious accessibility violations for the marketing surface shell", async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <MarketingSurfaceLayout
          description="Accessible public marketing layout."
          eyebrow="Public Surface"
          links={[{ href: "/", label: "Home" }]}
          navigationLabel="Public site navigation"
          title="Eli Coach Platform"
        >
          <DemoPageShell
            description="A marketing page that stays indexable and keyboard friendly."
            eyebrow="Public Surface"
            title="Public homepage"
          />
        </MarketingSurfaceLayout>
      </MemoryRouter>,
    );

    await expectNoAxeViolations(baseElement);
  });

  it("has no obvious accessibility violations for the client surface shell", async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <SidebarSurfaceLayout
          asideLabel="Client portal sidebar"
          description="Accessible client layout."
          eyebrow="Client Portal"
          links={[{ href: "/client", label: "Dashboard" }]}
          navigationLabel="Client portal navigation"
          title="Eli Client Portal"
        >
          <DemoPageShell
            description="A client page that preserves clear landmarks and headings."
            eyebrow="Client Portal"
            title="Client dashboard"
          />
        </SidebarSurfaceLayout>
      </MemoryRouter>,
    );

    await expectNoAxeViolations(baseElement);
  });

  it("has no obvious accessibility violations for the coach surface shell", async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <SidebarSurfaceLayout
          asideLabel="Coach portal sidebar"
          description="Accessible coach layout."
          eyebrow="Coach Portal"
          links={[{ href: "/coach", label: "Workspace" }]}
          navigationLabel="Coach portal navigation"
          title="Eli Coach Portal"
        >
          <DemoPageShell
            description="A coach page that keeps navigation, headings, and content structure aligned."
            eyebrow="Coach Portal"
            title="Coach workspace"
          />
        </SidebarSurfaceLayout>
      </MemoryRouter>,
    );

    await expectNoAxeViolations(baseElement);
  });
});
