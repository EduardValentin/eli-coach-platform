// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { IconHint } from "./icon-hint";

const HINT = "Waist divided by height.";

afterEach(() => {
  cleanup();
});

function renderHint() {
  render(
    <IconHint
      contentParityRoot="RatioHint"
      icon={<Info aria-hidden="true" size={16} />}
      label="What the ratio means"
    >
      <p>{HINT}</p>
    </IconHint>,
  );

  return {
    trigger: screen.getByRole("button", { name: "What the ratio means" }),
    user: userEvent.setup(),
  };
}

describe("IconHint", () => {
  it("stays closed until the coach reaches for it", () => {
    // arrange
    // act
    renderHint();

    // assert
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("opens on hover", async () => {
    // arrange
    const { trigger, user } = renderHint();

    // act
    await user.hover(trigger);

    // assert
    expect(await screen.findByText(HINT)).toBeInTheDocument();
  });

  it("closes when the pointer leaves", async () => {
    // arrange
    const { trigger, user } = renderHint();
    await user.hover(trigger);
    await screen.findByText(HINT);

    // act
    await user.unhover(trigger);

    // assert
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("keeps a hover-opened hint open through a click", async () => {
    // arrange
    const { trigger, user } = renderHint();
    await user.hover(trigger);

    // act
    await user.click(trigger);

    // assert
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it("opens on a tap", async () => {
    // arrange
    const { trigger, user } = renderHint();

    // act
    await user.pointer({ keys: "[TouchA]", target: trigger });

    // assert
    expect(await screen.findByText(HINT)).toBeInTheDocument();
  });

  it("closes on a second tap", async () => {
    // arrange
    const { trigger, user } = renderHint();
    await user.pointer({ keys: "[TouchA]", target: trigger });
    await screen.findByText(HINT);

    // act
    await user.pointer({ keys: "[TouchA]", target: trigger });

    // assert
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and describes the button by its hint", async () => {
    // arrange
    const { trigger, user } = renderHint();

    // act
    await user.tab();

    // assert
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleDescription(HINT);
  });

  it("closes on Escape", async () => {
    // arrange
    const { user } = renderHint();
    await user.tab();
    await screen.findByText(HINT);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it("marks its content as the hint root", async () => {
    // arrange
    const { trigger, user } = renderHint();

    // act
    await user.hover(trigger);

    // assert
    expect(
      (await screen.findByText(HINT)).closest('[data-parity-root="RatioHint"]'),
    ).not.toBeNull();
  });
});

describe("IconHint presentation", () => {
  function renderPresented(
    presentation: Pick<ComponentProps<typeof IconHint>, "size" | "tone">,
  ) {
    render(
      <IconHint
        icon={<Info aria-hidden="true" size={12} />}
        label="Rescheduled"
        {...presentation}
      >
        Rescheduled
      </IconHint>,
    );

    return screen.getByRole("button", { name: "Rescheduled" });
  }

  it("is a 24px round button by default", () => {
    // arrange
    // act
    const trigger = renderPresented({});

    // assert
    expect(trigger).toHaveClass("size-6", "rounded-full");
  });

  it("is a 20px button with the control corner when compact", () => {
    // arrange
    // act
    const trigger = renderPresented({ size: "compact" });

    // assert
    expect(trigger).toHaveClass("size-5", "rounded-control");
    expect(trigger).not.toHaveClass("size-6", "rounded-full");
  });

  it("uses secondary ink that turns primary on hover when muted", () => {
    // arrange
    // act
    const trigger = renderPresented({ tone: "muted" });

    // assert
    expect(trigger).toHaveClass(
      "text-text-secondary",
      "hover:text-text-primary",
    );
  });
});
