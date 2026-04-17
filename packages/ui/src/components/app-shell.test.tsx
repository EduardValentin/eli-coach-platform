// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppShell, Panel } from "./app-shell";

afterEach(() => {
  cleanup();
});

describe("AppShell", () => {
  it("renders the main title, description, and optional footer content", () => {
    render(
      <AppShell description="Page description" footer="Supportive footer copy" title="Client-facing app shell">
        <div>Page content</div>
      </AppShell>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Client-facing app shell" })).toBeInTheDocument();
    expect(screen.getByText("Page description")).toBeInTheDocument();
    expect(screen.getByText("Supportive footer copy")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});

describe("AppShell accessibility", () => {
  it("renders one h1 and keeps panel headings nested under h2", () => {
    render(
      <AppShell description="Page description" title="Client-facing app shell">
        <Panel description="Panel description" title="Panel title">
          <div>Panel content</div>
        </Panel>
      </AppShell>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Panel title" })).toBeInTheDocument();
    expect(screen.getByText("Panel description")).toBeInTheDocument();
  });
});
