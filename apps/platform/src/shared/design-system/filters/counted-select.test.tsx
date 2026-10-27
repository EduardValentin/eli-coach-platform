// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CountedSelect } from "./counted-select";

type Equipment = "any" | "none";

const OPTIONS: readonly Equipment[] = ["any", "none"];

const LABELS: Record<Equipment, string> = {
  any: "Any equipment",
  none: "No equipment",
};

const COUNTS: Record<Equipment, number> = { any: 12, none: 3 };

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
});

function renderEquipmentFilter() {
  const onChoose = vi.fn();
  render(
    <CountedSelect<Equipment>
      countParity={(option) => `equipment-count-${option}`}
      counts={COUNTS}
      label="Equipment"
      labels={LABELS}
      onChoose={onChoose}
      options={OPTIONS}
      triggerParity="equipment-filter"
      value="any"
    />,
  );
  return { onChoose, user: userEvent.setup() };
}

async function openFilter(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("combobox", { name: "Equipment" }).focus();
  await user.keyboard("{Enter}");
}

describe("CountedSelect", () => {
  it("is named for its label and shows the chosen option's label alone", () => {
    // arrange, act
    renderEquipmentFilter();

    // assert
    const trigger = screen.getByRole("combobox", { name: "Equipment" });
    expect(trigger).toHaveTextContent(/^Any equipment$/);
    expect(trigger).toHaveAttribute("data-parity", "equipment-filter");
  });

  it("lists every option with its count badge", async () => {
    // arrange
    const { user } = renderEquipmentFilter();

    // act
    await openFilter(user);

    // assert
    const anyOption = screen.getByRole("option", { name: "Any equipment 12" });
    const noneOption = screen.getByRole("option", { name: "No equipment 3" });
    expect(within(anyOption).getByText("12")).toHaveAttribute(
      "data-parity",
      "equipment-count-any",
    );
    expect(within(noneOption).getByText("3")).toHaveAttribute(
      "data-parity",
      "equipment-count-none",
    );
  });

  it("hands back the option that was chosen", async () => {
    // arrange
    const { onChoose, user } = renderEquipmentFilter();
    await openFilter(user);

    // act
    await user.click(screen.getByRole("option", { name: "No equipment 3" }));

    // assert
    expect(onChoose).toHaveBeenCalledExactlyOnceWith("none");
  });
});
