// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./index";

afterEach(() => {
  cleanup();
});

function renderTabs() {
  const user = userEvent.setup();

  render(
    <Tabs defaultValue="upcoming">
      <TabsList aria-label="Call status">
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="past">Past</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming">Two upcoming calls</TabsContent>
      <TabsContent value="past">One past call</TabsContent>
    </Tabs>,
  );

  return user;
}

describe("segmented tabs", () => {
  it("shows the panel of the selected tab and hides the others", () => {
    // arrange, act
    renderTabs();

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Two upcoming calls")).toBeInTheDocument();
    expect(screen.queryByText("One past call")).not.toBeInTheDocument();
  });

  it("moves between tabs from the keyboard", async () => {
    // arrange
    const user = renderTabs();

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("One past call")).toBeInTheDocument();
  });

  it("wraps its bar instead of overflowing a narrow panel", () => {
    // arrange, act
    renderTabs();

    // assert
    expect(screen.getByRole("tablist")).toHaveClass("max-w-full", "flex-wrap");
  });

  it("lets every tab share the width of the bar", () => {
    // arrange, act
    renderTabs();

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveClass(
      "flex-auto",
    );
  });
});
