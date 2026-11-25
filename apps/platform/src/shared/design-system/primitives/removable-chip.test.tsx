// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RemovableChip } from "./removable-chip";

afterEach(cleanup);

describe("RemovableChip", () => {
  it("lists its label with a button that removes it", async () => {
    // arrange
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ul>
        <RemovableChip
          label="Muscle: Chest"
          onRemove={onRemove}
          removeLabel="Remove filter Muscle: Chest"
        />
      </ul>,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Remove filter Muscle: Chest" }),
    );

    // assert
    expect(screen.getByRole("listitem")).toHaveTextContent("Muscle: Chest");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
