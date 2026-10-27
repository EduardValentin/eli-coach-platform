// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarClock, CalendarX } from "lucide-react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";

import { RowActionsMenu, type RowMenuAction } from "./row-actions-menu";

const REASON = "This check-in has already been moved twice.";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

function checkInActions({
  onCancel,
  onReschedule,
}: {
  onCancel: () => void;
  onReschedule: () => void;
}): RowMenuAction[] {
  return [
    {
      disabledReason: REASON,
      icon: CalendarClock,
      label: "Reschedule",
      name: "reschedule",
      onSelect: onReschedule,
    },
    {
      icon: CalendarX,
      label: "Cancel",
      name: "cancel",
      onSelect: onCancel,
      tone: "destructive",
    },
  ];
}

function renderMenu() {
  const onReschedule = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <main>
      <RowActionsMenu
        actions={checkInActions({ onCancel, onReschedule })}
        label="More actions"
      />
    </main>,
  );

  return {
    baseElement: view.baseElement,
    onCancel,
    onReschedule,
    trigger: screen.getByRole("button", { name: "More actions" }),
    user: userEvent.setup(),
  };
}

async function openMenu(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
) {
  await user.click(trigger);
  await screen.findByRole("menu");
}

async function openMenuOnRescheduleByKeyboard(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
) {
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("menu");
  await user.keyboard("{ArrowDown}{ArrowUp}");
}

describe("RowActionsMenu", () => {
  it("offers each action as a menu item in the order given", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Reschedule", "Cancel"]);
  });

  it("marks a destructive action apart from a default one", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(screen.getByRole("menuitem", { name: "Cancel" })).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("hooks its trigger, its open menu and each action for parity", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(trigger).toHaveAttribute("data-parity", "row-actions-trigger");
    expect(screen.getByRole("menu")).toHaveAttribute(
      "data-parity-root",
      "RowActionsMenu",
    );
    expect(screen.getByRole("menuitem", { name: "Cancel" })).toHaveAttribute(
      "data-parity",
      "row-action-cancel",
    );
  });

  it("renders nothing when no action applies", () => {
    // arrange
    // act
    const { container } = render(
      <RowActionsMenu actions={[]} label="More actions" />,
    );

    // assert
    expect(container).toBeEmptyDOMElement();
  });

  it("runs the chosen action once and hands focus back to the trigger", async () => {
    // arrange
    const { onCancel, trigger, user } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole("menuitem", { name: "Cancel" }));

    // assert
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
    expect(trigger).toHaveFocus();
  });

  it("does not run an action when the menu closes without a choice", async () => {
    // arrange
    const { onCancel, trigger, user } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(trigger).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("a row menu action that is not allowed right now", () => {
  it("stays in the menu, marked disabled", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(
      screen.getByRole("menuitem", { name: "Reschedule" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("can be reached with the arrow keys and explains itself there", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenuOnRescheduleByKeyboard(user, trigger);

    // assert
    const reschedule = screen.getByRole("menuitem", { name: "Reschedule" });
    expect(reschedule).toHaveFocus();
    await waitFor(() => expect(reschedule).toHaveAccessibleDescription(REASON));
  });

  it("explains itself on hover", async () => {
    // arrange
    const { trigger, user } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.hover(screen.getByRole("menuitem", { name: "Reschedule" }));

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
  });

  it("explains itself on a tap without running", async () => {
    // arrange
    const { onReschedule, trigger, user } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("menuitem", { name: "Reschedule" }),
    });

    // assert
    expect(await screen.findByText(REASON)).toBeInTheDocument();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("does not run on a click", async () => {
    // arrange
    const { onReschedule, trigger, user } = renderMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole("menuitem", { name: "Reschedule" }));

    // assert
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("does not run on Enter", async () => {
    // arrange
    const { onReschedule, trigger, user } = renderMenu();
    await openMenuOnRescheduleByKeyboard(user, trigger);

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("passes the axe checks with its reason open", async () => {
    // arrange
    const { baseElement, trigger, user } = renderMenu();
    await openMenu(user, trigger);
    await user.hover(screen.getByRole("menuitem", { name: "Reschedule" }));
    await screen.findByText(REASON);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("hands its trigger to the caller's ref", () => {
    // arrange
    const triggerRef = createRef<HTMLButtonElement>();

    // act
    render(
      <RowActionsMenu
        actions={checkInActions({ onCancel: vi.fn(), onReschedule: vi.fn() })}
        label="More actions"
        triggerRef={triggerRef}
      />,
    );

    // assert
    expect(triggerRef.current).toBe(
      screen.getByRole("button", { name: "More actions" }),
    );
  });
});
