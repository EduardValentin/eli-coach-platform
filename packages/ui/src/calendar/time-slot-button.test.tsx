// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TimeSlotButton } from ".";

afterEach(() => {
  cleanup();
});

describe("a time slot button", () => {
  it("reads its time alone and reports the press", async () => {
    // arrange
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TimeSlotButton isSelected={false} label="18:00" onSelect={onSelect} />,
    );

    // act
    await user.click(screen.getByRole("button", { name: "18:00" }));

    // assert
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("reads a detail after its time, apart from it, in the pending tone while not chosen", () => {
    // arrange, act
    render(
      <TimeSlotButton
        detail={{ kind: "text", parity: "hour-clashes", text: "2 clashes" }}
        isSelected={false}
        label="18:00"
        onSelect={() => {}}
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "18:00 2 clashes" }),
    ).toHaveTextContent(/^18:00 2 clashes$/);
    expect(screen.getByText("2 clashes")).toHaveClass("text-status-pending");
    expect(screen.getByText("2 clashes")).toHaveAttribute(
      "data-parity",
      "hour-clashes",
    );
  });

  it("drops the pending tone from its detail once chosen", () => {
    // arrange, act
    render(
      <TimeSlotButton
        detail={{ kind: "text", parity: "hour-clashes", text: "1 clash" }}
        isSelected
        label="18:00"
        onSelect={() => {}}
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "18:00 1 clash" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1 clash")).not.toHaveClass("text-status-pending");
  });

  it("hangs its detail beside the time so the time stays centred", () => {
    // arrange, act
    render(
      <TimeSlotButton
        detail={{ kind: "text", parity: "hour-clashes", text: "1 clash" }}
        isSelected={false}
        label="18:00"
        onSelect={() => {}}
      />,
    );

    // assert
    expect(screen.getByText("18:00").parentElement).toHaveClass("relative");
    expect(screen.getByText("1 clash")).toHaveClass(
      "absolute",
      "left-full",
      "ml-2",
      "whitespace-nowrap",
    );
  });

  it("holds a silent placeholder where its detail goes while the detail is counted", () => {
    // arrange, act
    render(
      <TimeSlotButton
        detail={{ kind: "loading", parity: "hour-clashes-loading" }}
        isSelected
        label="18:00"
        onSelect={() => {}}
      />,
    );

    // assert
    const button = screen.getByRole("button", { name: "18:00" });
    const placeholder = button.querySelector('[data-slot="skeleton"]');
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(placeholder).toHaveAttribute("data-parity", "hour-clashes-loading");
    expect(placeholder).toHaveClass("absolute", "left-full", "h-3", "w-12");
  });
});
