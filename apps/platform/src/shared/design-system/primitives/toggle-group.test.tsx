// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

afterEach(() => {
  cleanup();
});

function renderGroup(options: {
  onValueChange: (value: string) => void;
  value: string;
}) {
  return render(
    <ToggleGroup
      aria-label="Currency"
      onValueChange={options.onValueChange}
      value={options.value}
    >
      <ToggleGroupItem value="EUR">EUR</ToggleGroupItem>
      <ToggleGroupItem value="USD">USD</ToggleGroupItem>
    </ToggleGroup>,
  );
}

describe("toggle group selection", () => {
  it("exposes a named group holding one checked radio per option", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "EUR" });

    // assert
    expect(
      screen.getByRole("radiogroup", { name: "Currency" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "EUR" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "USD" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("reports the option a click chooses", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "EUR" });

    // act
    await user.click(screen.getByRole("radio", { name: "USD" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("USD");
  });

  it("keeps the chosen option when it is activated again", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "EUR" });

    // act
    await user.click(screen.getByRole("radio", { name: "EUR" }));

    // assert
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("chooses the focused option from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "EUR" });

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("radio", { name: "USD" })).toHaveFocus();
    expect(onValueChange).toHaveBeenCalledWith("USD");
  });
});

describe("toggle group appearance", () => {
  it("sets the options in a raised pill track", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "EUR" });

    // assert
    expect(screen.getByRole("radiogroup", { name: "Currency" })).toHaveClass(
      "rounded-full",
      "border-control-border-soft",
      "bg-surface-base",
      "p-1",
      "shadow-card",
    );
  });

  it("fills the chosen pill with the inverted surface", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "EUR" });

    // assert
    expect(screen.getByRole("radio", { name: "EUR" })).toHaveClass(
      "rounded-full",
      "text-copy-muted",
      "data-[state=off]:hover:text-text-primary",
      "data-[state=on]:bg-surface-inverted",
      "data-[state=on]:text-text-inverted",
    );
  });
});
