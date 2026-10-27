// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";

import { Button } from "./button";
import { DisabledActionHint } from "./disabled-action-hint";

const REASON = "You can send another request once this one is answered.";

const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

afterEach(() => {
  cleanup();
});

function renderDisabledAction() {
  const onRequest = vi.fn();
  const view = render(
    <main>
      <DisabledActionHint reason={REASON}>
        <Button onClick={onRequest}>Request check-in</Button>
      </DisabledActionHint>
    </main>,
  );

  return {
    action: screen.getByRole("button", { name: "Request check-in" }),
    baseElement: view.baseElement,
    onRequest,
    user: userEvent.setup(),
  };
}

describe("DisabledActionHint", () => {
  it("keeps the action focusable and marks it disabled", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.tab();

    // assert
    expect(action).toHaveFocus();
    expect(action).toBeEnabled();
    expect(action).toHaveAttribute("aria-disabled", "true");
  });

  it("stays closed until she reaches for the action", () => {
    // arrange
    // act
    renderDisabledAction();

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it("opens on hover and describes the action by its reason", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.hover(action);

    // assert
    expect(await screen.findByText(REASON)).toBeVisible();
    expect(action).toHaveAccessibleDescription(REASON);
  });

  it("closes when the pointer leaves", async () => {
    // arrange
    const { action, user } = renderDisabledAction();
    await user.hover(action);
    await screen.findByText(REASON);

    // act
    await user.unhover(action);

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
    expect(action).not.toHaveAccessibleDescription(REASON);
  });

  it("opens on a tap", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.pointer({ keys: "[TouchA]", target: action });

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });

  it("closes on a second tap", async () => {
    // arrange
    const { action, user } = renderDisabledAction();
    await user.pointer({ keys: "[TouchA]", target: action });
    await screen.findByText(REASON);

    // act
    await user.pointer({ keys: "[TouchA]", target: action });

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it("opens on keyboard focus and describes the action by its reason", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.tab();

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
    expect(action).toHaveAccessibleDescription(REASON);
  });

  it("closes on Escape", async () => {
    // arrange
    const { action, user } = renderDisabledAction();
    await user.tab();
    await screen.findByText(REASON);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
    expect(action).not.toHaveAccessibleDescription(REASON);
  });

  it("closes when focus leaves the action", async () => {
    // arrange
    const { action, user } = renderDisabledAction();
    await user.tab();
    await screen.findByText(REASON);

    // act
    act(() => action.blur());

    // assert
    expect(screen.queryByText(REASON)).not.toBeInTheDocument();
  });

  it("does nothing when clicked and keeps the reason in view", async () => {
    // arrange
    const { action, onRequest, user } = renderDisabledAction();

    // act
    await user.click(action);

    // assert
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByText(REASON)).toBeInTheDocument();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("does nothing on %s", async (_key, keys) => {
    // arrange
    const { onRequest, user } = renderDisabledAction();
    await user.tab();

    // act
    await user.keyboard(keys);

    // assert
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("marks its reason for parity", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.hover(action);

    // assert
    expect(
      (await screen.findByText(REASON)).closest(
        '[data-parity="disabled-action-hint"]',
      ),
    ).not.toBeNull();
  });

  it("opens centred above the action", async () => {
    // arrange
    const { action, user } = renderDisabledAction();

    // act
    await user.hover(action);

    // assert
    expect(
      (await screen.findByText(REASON)).closest("[data-side]"),
    ).toHaveAttribute("data-side", "top");
    expect(
      (await screen.findByText(REASON)).closest("[data-align]"),
    ).toHaveAttribute("data-align", "center");
  });

  it("passes the axe checks with its reason open", async () => {
    // arrange
    const { action, baseElement, user } = renderDisabledAction();
    await user.hover(action);
    await screen.findByText(REASON);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
