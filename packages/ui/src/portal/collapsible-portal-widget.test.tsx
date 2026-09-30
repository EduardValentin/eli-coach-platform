// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { CollapsiblePortalWidget } from "./collapsible-portal-widget";

afterEach(() => {
  cleanup();
});

function AssessmentCallWidget() {
  return (
    <CollapsiblePortalWidget
      className="mb-8"
      data-parity-root="AssessmentCallBlock"
      headingId="assessment-call-heading"
      icon={<svg aria-hidden="true" />}
      title="Assessment call"
    >
      <p>Booked for Monday.</p>
    </CollapsiblePortalWidget>
  );
}

describe("CollapsiblePortalWidget", () => {
  it("starts collapsed under a second-level heading that names its region", () => {
    // arrange, act
    render(<AssessmentCallWidget />);

    // assert
    const region = screen.getByRole("region", { name: "Assessment call" });
    expect(region).toHaveAttribute(
      "aria-labelledby",
      "assessment-call-heading",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Assessment call" }),
    ).toHaveAttribute("id", "assessment-call-heading");
    expect(
      screen.getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Booked for Monday.")).not.toBeInTheDocument();
  });

  it("expands from a click on its heading", async () => {
    // arrange
    const user = userEvent.setup();
    render(<AssessmentCallWidget />);

    // act
    await user.click(screen.getByRole("button", { name: "Assessment call" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Booked for Monday.")).toBeVisible();
  });

  it("expands from Enter on its heading", async () => {
    // arrange
    const user = userEvent.setup();
    render(<AssessmentCallWidget />);
    await user.tab();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByText("Booked for Monday.")).toBeVisible();
  });

  it("collapses again from Space on its heading", async () => {
    // arrange
    const user = userEvent.setup();
    render(<AssessmentCallWidget />);
    await user.tab();
    await user.keyboard("{Enter}");

    // act
    await user.keyboard(" ");

    // assert
    expect(
      screen.getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Booked for Monday.")).not.toBeInTheDocument();
  });

  it("frames itself as the default portal widget panel with its data attributes", () => {
    // arrange, act
    render(<AssessmentCallWidget />);

    // assert
    const region = screen.getByRole("region", { name: "Assessment call" });
    expect(region).toHaveClass(
      "flex",
      "flex-col",
      "rounded-panel",
      "bg-surface-base",
      "p-6",
      "shadow-soft",
      "mb-8",
    );
    expect(region).toHaveAttribute("data-parity-root", "AssessmentCallBlock");
  });

  it("sets its title in the widget title type beside the icon", () => {
    // arrange, act
    render(<AssessmentCallWidget />);

    // assert
    const title = screen.getByText("Assessment call");
    expect(title).toHaveClass(
      "flex",
      "items-center",
      "gap-2",
      "text-base",
      "font-semibold",
      "text-text-primary",
    );
    expect(title.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
