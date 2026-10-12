import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CountedSelect } from "./CountedSelect";

type Status = "active" | "archived";

const LABELS: Record<Status, string> = { active: "Active", archived: "Archived" };

function renderSelect() {
  const onChoose = vi.fn();
  render(
    <CountedSelect<Status>
      label="Status"
      value="active"
      options={["active", "archived"]}
      labels={LABELS}
      counts={{ active: 12, archived: 1 }}
      onChoose={onChoose}
    />,
  );
  return { user: userEvent.setup(), onChoose };
}

describe("CountedSelect", () => {
  it("shows the chosen option on a trigger named for the filter", () => {
    // arrange
    // act
    renderSelect();

    // assert
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Active");
  });

  it("counts every option", async () => {
    // arrange
    const { user } = renderSelect();

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    // assert
    expect(within(screen.getByRole("option", { name: /Active/ })).getByText("12")).toBeInTheDocument();
    expect(within(screen.getByRole("option", { name: /Archived/ })).getByText("1")).toBeInTheDocument();
  });

  it("hands back the chosen option", async () => {
    // arrange
    const { user, onChoose } = renderSelect();
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    // act
    await user.click(screen.getByRole("option", { name: /Archived/ }));

    // assert
    expect(onChoose).toHaveBeenCalledWith("archived");
  });
});
