import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

async function openSelect() {
  const user = userEvent.setup();
  render(
    <Select defaultValue="week">
      <SelectTrigger aria-label="Period">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week">Week</SelectItem>
        <SelectItem value="month">Month</SelectItem>
      </SelectContent>
    </Select>,
  );
  await user.click(screen.getByRole("combobox", { name: "Period" }));
}

describe("select options", () => {
  it("draws an option's focus ring inside its own box, without a halo", async () => {
    // arrange
    await openSelect();

    // act
    const option = screen.getByRole("option", { name: "Month" });

    // assert
    expect(option).toHaveAttribute("data-focus-ring");
    expect(option).toHaveClass("[--focus-ring-offset:-2px]", "[--focus-ring-halo:0_0_#0000]");
  });

  it("draws the checked option's ring white and one step further in, so it shows on the primary fill", async () => {
    // arrange
    await openSelect();

    // act
    const checked = screen.getByRole("option", { name: "Week" });

    // assert
    expect(checked).toHaveClass(
      "data-[state=checked]:[--focus-ring-offset:-4px]",
      "data-[state=checked]:[--focus-ring:var(--primary-foreground)]",
    );
  });
});
