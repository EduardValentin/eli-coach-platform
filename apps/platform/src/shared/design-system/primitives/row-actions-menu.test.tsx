// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarClock, CalendarX, Copy, Trash2 } from "lucide-react";
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

  it("fades only its icon and label, so its focus ring keeps full strength", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    const item = screen.getByRole("menuitem", { name: "Reschedule" });
    expect(item).toHaveClass("aria-disabled:opacity-100");
    expect(item.querySelector("svg")).toHaveClass("opacity-50");
    expect(screen.getByText("Reschedule")).toHaveClass("opacity-50");
  });

  it("leaves an action that can run unfaded", async () => {
    // arrange
    const { trigger, user } = renderMenu();

    // act
    await openMenu(user, trigger);

    // assert
    const item = screen.getByRole("menuitem", { name: "Cancel" });
    expect(item).not.toHaveClass("aria-disabled:opacity-100");
    expect(item.querySelector("svg")).not.toHaveClass("opacity-50");
    expect(screen.getByText("Cancel")).not.toHaveClass("opacity-50");
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

describe("a row menu action held back with a hint", () => {
  const HINT = "Used in 1 program";

  function renderHeldBackMenu() {
    const onDelete = vi.fn();
    render(
      <main>
        <RowActionsMenu
          actions={[
            {
              disabledHint: HINT,
              icon: Trash2,
              label: "Delete",
              name: "delete",
              onSelect: onDelete,
              tone: "destructive",
            },
          ]}
          label="More actions"
        />
      </main>,
    );

    return {
      onDelete,
      trigger: screen.getByRole("button", { name: "More actions" }),
      user: userEvent.setup(),
    };
  }

  it("stays in the menu, marked disabled, and keeps its own opacity so only its icon and label fade", async () => {
    // arrange
    const { trigger, user } = renderHeldBackMenu();

    // act
    await openMenu(user, trigger);

    // assert
    const item = screen.getByRole("menuitem", { name: "Delete" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveClass("aria-disabled:opacity-100");
    expect(screen.getByText("Delete")).toHaveClass("opacity-50");
  });

  it("takes the menu's own focus fill instead of the faint red tint of a destructive item", async () => {
    // arrange
    const { trigger, user } = renderHeldBackMenu();

    // act
    await openMenu(user, trigger);

    // assert
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveClass(
      "data-[variant=destructive]:focus:bg-primary-soft",
    );
  });

  it("keeps the red focus tint on a destructive item that can run", async () => {
    // arrange
    render(
      <main>
        <RowActionsMenu
          actions={[
            {
              icon: Trash2,
              label: "Delete",
              name: "delete",
              onSelect: vi.fn(),
              tone: "destructive",
            },
          ]}
          label="More actions"
        />
      </main>,
    );

    // act
    await openMenu(
      userEvent.setup(),
      screen.getByRole("button", { name: "More actions" }),
    );

    // assert
    expect(screen.getByRole("menuitem", { name: "Delete" })).not.toHaveClass(
      "data-[variant=destructive]:focus:bg-primary-soft",
    );
  });

  it("explains itself below the item, aligned to its trailing end, on hover", async () => {
    // arrange
    const { trigger, user } = renderHeldBackMenu();
    await openMenu(user, trigger);

    // act
    await user.hover(screen.getByRole("menuitem", { name: "Delete" }));

    // assert
    const hint = (await screen.findByText(HINT)).closest("[data-parity]");
    expect(hint).toHaveAttribute("data-parity", "row-action-delete-hint");
    expect(hint).toHaveAttribute("data-side", "bottom");
    expect(hint).toHaveAttribute("data-align", "end");
  });

  it("can be reached with the arrow keys, explains itself there and does not run on Enter", async () => {
    // arrange
    const { onDelete, trigger, user } = renderHeldBackMenu();
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");

    // act
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    // assert
    const item = screen.getByRole("menuitem", { name: "Delete" });
    expect(item).toHaveFocus();
    await waitFor(() => expect(item).toHaveAccessibleDescription(HINT));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("does not run on a click", async () => {
    // arrange
    const { onDelete, trigger, user } = renderHeldBackMenu();
    await openMenu(user, trigger);

    // act
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    // assert
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("a row menu with a submenu", () => {
  function renderMenuWithSubmenu() {
    const onCopyToTuesday = vi.fn();
    const onCopyToWednesday = vi.fn();
    render(
      <main>
        <RowActionsMenu
          actions={[
            {
              actions: [
                {
                  icon: CalendarClock,
                  label: "Tuesday",
                  name: "copy-tuesday",
                  onSelect: onCopyToTuesday,
                },
                {
                  icon: CalendarClock,
                  label: "Wednesday",
                  name: "copy-wednesday",
                  onSelect: onCopyToWednesday,
                },
              ],
              icon: Copy,
              label: "Copy day to",
              name: "copy-to",
            },
            {
              icon: CalendarX,
              label: "Cancel",
              name: "cancel",
              onSelect: vi.fn(),
            },
          ]}
          label="More actions"
        />
      </main>,
    );

    return {
      onCopyToTuesday,
      onCopyToWednesday,
      trigger: screen.getByRole("button", { name: "More actions" }),
      user: userEvent.setup(),
    };
  }

  async function openSubmenuByKeyboard(
    user: ReturnType<typeof userEvent.setup>,
    trigger: HTMLElement,
  ) {
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{ArrowUp}{ArrowRight}");
  }

  it("lists the submenu among the menu's items as one that opens another menu", async () => {
    // arrange
    const { trigger, user } = renderMenuWithSubmenu();

    // act
    await openMenu(user, trigger);

    // assert
    const submenu = screen.getByRole("menuitem", { name: "Copy day to" });
    expect(submenu).toHaveAttribute("aria-haspopup", "menu");
    expect(submenu).toHaveAttribute("data-parity", "row-action-copy-to");
    expect(screen.queryByRole("menuitem", { name: "Tuesday" })).toBeNull();
  });

  it("opens its items beside the menu on ArrowRight", async () => {
    // arrange
    const { trigger, user } = renderMenuWithSubmenu();

    // act
    await openSubmenuByKeyboard(user, trigger);

    // assert
    expect(
      await screen.findByRole("menuitem", { name: "Tuesday" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Wednesday" })).toHaveAttribute(
      "data-parity",
      "row-action-copy-wednesday",
    );
  });

  it("runs the chosen submenu item once and hands focus back to the trigger", async () => {
    // arrange
    const { onCopyToTuesday, onCopyToWednesday, trigger, user } =
      renderMenuWithSubmenu();
    await openSubmenuByKeyboard(user, trigger);
    await screen.findByRole("menuitem", { name: "Tuesday" });

    // act
    await user.keyboard("{Enter}");

    // assert
    await waitFor(() => expect(onCopyToTuesday).toHaveBeenCalledOnce());
    expect(onCopyToWednesday).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
});

describe("a row menu named for its place in the page", () => {
  function renderResetMenu() {
    render(
      <main>
        <RowActionsMenu
          actions={[{ label: "Reset", name: "reset", onSelect: vi.fn() }]}
          label="Block actions"
          parityRoot="BlockActionsMenu"
        />
      </main>,
    );

    return userEvent.setup();
  }

  it("names its menu for the surface that asks", async () => {
    // arrange
    const user = renderResetMenu();

    // act
    await user.click(screen.getByRole("button", { name: "Block actions" }));

    // assert
    expect(await screen.findByRole("menu")).toHaveAttribute(
      "data-parity-root",
      "BlockActionsMenu",
    );
  });

  it("lets an item go without an icon", async () => {
    // arrange
    const user = renderResetMenu();

    // act
    await user.click(screen.getByRole("button", { name: "Block actions" }));

    // assert
    expect(
      (await screen.findByRole("menuitem", { name: "Reset" })).querySelector(
        "svg",
      ),
    ).toBeNull();
  });
});
