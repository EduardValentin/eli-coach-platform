// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsRow, SettingsRows, SettingsSection } from "./settings-section";

afterEach(() => {
  cleanup();
});

describe("SettingsSection", () => {
  it("names its region after the heading and shows the description", () => {
    // arrange
    // act
    render(
      <SettingsSection
        headingId="calls-heading"
        title="Assessment calls"
        description="Visitors book inside the days and hours you set here."
      >
        <p>Rows</p>
      </SettingsSection>,
    );

    // assert
    expect(
      screen.getByRole("region", { name: "Assessment calls" }),
    ).toHaveAttribute("aria-labelledby", "calls-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Assessment calls" }),
    ).toHaveAttribute("id", "calls-heading");
    expect(
      screen.getByText("Visitors book inside the days and hours you set here."),
    ).toHaveClass("mt-1", "text-sm", "text-text-secondary");
  });

  it("renders the footer only when given", () => {
    // arrange
    // act
    render(
      <SettingsSection
        headingId="with-footer"
        title="With footer"
        footer={<button type="button">Save changes</button>}
      >
        <p>Rows</p>
      </SettingsSection>,
    );
    render(
      <SettingsSection headingId="without-footer" title="Without footer">
        <p>Rows</p>
      </SettingsSection>,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Save changes" }).parentElement,
    ).toHaveClass("flex", "justify-end", "gap-3", "border-t");
    expect(
      screen
        .getByRole("region", { name: "Without footer" })
        .querySelector(".border-t"),
    ).toBeNull();
  });
});

describe("SettingsRow", () => {
  it("names a fieldset row by its title", () => {
    // arrange
    // act
    render(
      <SettingsRows>
        <SettingsRow
          as="fieldset"
          labelId="weekdays-label"
          title="Days I take calls"
          description="Visitors can pick a slot on these days."
          layout="stacked"
        >
          <label>
            <input type="checkbox" /> Monday
          </label>
        </SettingsRow>
      </SettingsRows>,
    );

    // assert
    const fieldset = screen.getByRole("group", { name: "Days I take calls" });
    expect(fieldset.tagName).toBe("FIELDSET");
    expect(screen.getByText("Days I take calls")).toHaveClass(
      "text-sm",
      "font-medium",
      "text-text-primary",
    );
    expect(
      screen.getByRole("checkbox", { name: "Monday" }),
    ).toBeInTheDocument();
  });

  it("labels the control it is given a field id for", () => {
    // arrange
    // act
    render(
      <SettingsRow
        htmlFor="meeting-link"
        descriptionId="meeting-link-hint"
        title="Meeting link"
        description="The room every join link opens."
        layout="stacked"
      >
        <input
          id="meeting-link"
          aria-describedby="meeting-link-hint"
          type="url"
        />
      </SettingsRow>,
    );

    // assert
    expect(screen.getByLabelText("Meeting link")).toHaveAccessibleDescription(
      "The room every join link opens.",
    );
  });

  it("names a control block through the label id", () => {
    // arrange
    // act
    render(
      <SettingsRow labelId="hours-label" title="Hours" hint="e.g. 9:00 AM">
        <div aria-labelledby="hours-label" role="group">
          Selects
        </div>
      </SettingsRow>,
    );

    // assert
    expect(screen.getByRole("group", { name: "Hours" })).toBeInTheDocument();
    expect(screen.getByText("e.g. 9:00 AM")).toHaveClass(
      "mt-1",
      "text-xs",
      "tabular-nums",
      "text-text-secondary",
    );
  });

  it("stacks the control under the text in the stacked layout", () => {
    // arrange
    // act
    render(
      <SettingsRow title="Meeting link" layout="stacked">
        <input aria-label="Meeting link" type="url" />
      </SettingsRow>,
    );

    // assert
    expect(screen.getByRole("textbox").parentElement).toHaveClass(
      "mt-3",
      "w-full",
    );
    expect(screen.getByText("Meeting link").closest("div")).not.toHaveClass(
      "sm:flex-row",
    );
  });

  it("sits the control beside the text in the inline layout", () => {
    // arrange
    // act
    render(
      <SettingsRow title="Body weight">
        <select aria-label="Body weight unit">
          <option>kg</option>
        </select>
      </SettingsRow>,
    );

    // assert
    expect(screen.getByRole("combobox").parentElement).toHaveClass("shrink-0");
    expect(screen.getByRole("combobox").closest(".sm\\:flex-row")).toHaveClass(
      "px-5",
      "py-5",
      "sm:px-6",
      "flex",
      "flex-col",
      "gap-4",
      "sm:items-center",
      "sm:gap-6",
    );
  });

  it("passes attributes through to the row container", () => {
    // arrange
    // act
    render(
      <SettingsRow
        as="fieldset"
        aria-describedby="weekdays-error"
        title="Days I take calls"
      />,
    );

    // assert
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-describedby",
      "weekdays-error",
    );
  });
});
