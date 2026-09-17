// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles from the keyboard through its native checkbox semantics", async () => {
    // arrange
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });

    // act
    checkbox.focus();
    await user.keyboard(" ");

    // assert
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });
});
