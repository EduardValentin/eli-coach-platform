// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Video } from "lucide-react";
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
      icon={Video}
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
  it("sets an adornment beside the title and an action before the chevron, outside the trigger", () => {
    // arrange, act
    render(
      <CollapsiblePortalWidget
        action={<span>Approved</span>}
        headingId="onboarding-heading"
        title="Onboarding"
        titleAdornment={<button type="button">Screening warning</button>}
      >
        <p>Her answers.</p>
      </CollapsiblePortalWidget>,
    );

    // assert
    const trigger = screen.getByRole("button", { name: "Onboarding" });
    expect(trigger).not.toHaveTextContent("Approved");
    expect(trigger.querySelector("svg")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Screening warning" }).parentElement,
    ).toHaveClass("relative", "flex", "items-center");
    expect(screen.getByText("Approved").parentElement).toHaveClass(
      "relative",
      "-my-2",
      "flex",
      "items-center",
    );
  });

  it("stretches its trigger over the whole header so a click anywhere on it toggles", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <CollapsiblePortalWidget
        action={<span>Approved</span>}
        headingId="onboarding-heading"
        title="Onboarding"
      >
        <p>Her answers.</p>
      </CollapsiblePortalWidget>,
    );
    const trigger = screen.getByRole("button", { name: "Onboarding" });

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveClass(
      "min-w-0",
      "flex-initial",
      "after:absolute",
      "after:inset-0",
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Her answers.")).toBeVisible();
  });

  it("ends its header in a chevron that turns with the open state", () => {
    // arrange, act
    render(<AssessmentCallWidget />);

    // assert
    const region = screen.getByRole("region", { name: "Assessment call" });
    const chevron = [...region.querySelectorAll("svg")].at(-1);
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    expect(chevron).toHaveClass(
      "group-data-[state=open]/collapsible:rotate-180",
    );
    expect(
      screen
        .getByRole("button", { name: "Assessment call" })
        .contains(chevron ?? null),
    ).toBe(false);
  });
});
