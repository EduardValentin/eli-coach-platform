// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type TableSort,
} from "./table";

afterEach(() => {
  cleanup();
});

function RosterTable(props: { onSort?: () => void; sort?: TableSort }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {props.sort ? (
            <TableHead onSort={props.onSort ?? vi.fn()} sort={props.sort}>
              Client
            </TableHead>
          ) : (
            <TableHead>Client</TableHead>
          )}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Ana Popescu</TableCell>
          <TableCell>View details</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table", () => {
  it("reads as a native table of column headers, rows and cells", () => {
    // arrange, act
    render(<RosterTable />);

    // assert
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(
      within(table).getByRole("cell", { name: "Ana Popescu" }),
    ).toBeInTheDocument();
  });

  it("scrolls a wide table sideways inside its own frame", () => {
    // arrange, act
    render(<RosterTable />);

    // assert
    expect(screen.getByRole("table").parentElement).toHaveClass(
      "overflow-x-auto",
    );
  });

  it("leaves a column without a sort as a plain header", () => {
    // arrange, act
    render(<RosterTable />);

    // assert
    const header = screen.getByRole("columnheader", { name: "Client" });
    expect(header).not.toHaveAttribute("aria-sort");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  });

  it.each<TableSort>(["ascending", "descending", "none"])(
    "announces a %s sort on its column header",
    (sort) => {
      // arrange, act
      render(<RosterTable sort={sort} />);

      // assert
      expect(
        screen.getByRole("columnheader", { name: "Client" }),
      ).toHaveAttribute("aria-sort", sort);
    },
  );

  it("names the sort button after its column", () => {
    // arrange, act
    render(<RosterTable sort="none" />);

    // assert
    expect(screen.getByRole("button", { name: "Client" })).toBeInTheDocument();
  });

  it("sorts when the header button is pressed", async () => {
    // arrange
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<RosterTable onSort={onSort} sort="ascending" />);

    // act
    await user.click(screen.getByRole("button", { name: "Client" }));

    // assert
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it("sorts from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<RosterTable onSort={onSort} sort="none" />);

    // act
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("button", { name: "Client" })).toHaveFocus();
    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it("marks the sorted column in the interaction colour", () => {
    // arrange, act
    render(<RosterTable sort="descending" />);

    // assert
    expect(screen.getByText("Client")).toHaveClass("text-primary");
  });

  it("keeps an unsorted column's label in the header ink", () => {
    // arrange, act
    render(<RosterTable sort="none" />);

    // assert
    expect(screen.getByText("Client")).not.toHaveClass("text-primary");
  });
});
