// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MeasurementRow } from "~/features/client-profile/public/measurements";

import { MeasurementsTable } from "./measurements-table";

const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };

const FIRST_SET: MeasurementRow = {
  id: "5d0f6a3e-2b1c-4d5e-8f90-1a2b3c4d5e6f",
  recordedAt: "2026-09-01T10:00:00.000Z",
  weightKg: 70,
  waistCm: 80,
  hipsCm: 100.04,
  thighCm: null,
  armCm: 30,
  photos: [],
};

const SECOND_SET: MeasurementRow = {
  id: "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
  recordedAt: "2026-09-20T10:00:00.000Z",
  weightKg: 68.44,
  waistCm: 76.5,
  hipsCm: 98,
  thighCm: 57.25,
  armCm: null,
  photos: [
    { id: "0f1e2d3c-4b5a-4968-8776-655443322110", view: "front" },
    { id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", view: "back" },
  ],
};

const HISTORY = [FIRST_SET, SECOND_SET];

function columnHeaders(): string[] {
  return screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent ?? "");
}

function rowCells(rowIndex: number): string[] {
  return within(screen.getAllByRole("row")[rowIndex])
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

afterEach(() => {
  cleanup();
});

describe("the measurements table she reads", () => {
  it("lists her history newest first in her units without the ratio", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={HISTORY}
        perspective="client"
        units={IMPERIAL}
      />,
    );

    // assert
    expect(
      screen.getByRole("table", { name: "Measurements history, newest first" }),
    ).toBeInTheDocument();
    expect(columnHeaders()).toEqual([
      "Date",
      "Weight",
      "Waist",
      "Hips",
      "Thigh",
      "Arm",
    ]);
    expect(rowCells(1)).toEqual([
      "20 September",
      "150.9 lb",
      "30 in",
      "38.5 in",
      "22.5 in",
      "—",
    ]);
    expect(rowCells(2)).toEqual([
      "1 September",
      "154.3 lb",
      "31.5 in",
      "39.5 in",
      "—",
      "11.75 in",
    ]);
  });

  it("keeps her action beside the title once she has a history", () => {
    // arrange, act
    render(
      <MeasurementsTable
        action={<button type="button">Add</button>}
        emptyAction={<button type="button">Add your first measurements</button>}
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={HISTORY}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add your first measurements" }),
    ).not.toBeInTheDocument();
  });

  it("says nothing is recorded yet and offers the first set", () => {
    // arrange, act
    render(
      <MeasurementsTable
        action={<button type="button">Add</button>}
        emptyAction={<button type="button">Add your first measurements</button>}
        emptyMessage="Nothing recorded yet. Your first set goes in with your answers."
        headingId="measurements-heading"
        measurements={[]}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Measurements" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nothing recorded yet. Your first set goes in with your answers.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add your first measurements" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("the measurements table the coach reads", () => {
  it("lists the history in kg and cm with the waist-to-height ratio", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="She has not sent any measurements yet."
        headingId="measurements-panel-heading"
        heightCm={170}
        measurements={HISTORY}
        perspective="coach"
        ratioHidden={false}
      />,
    );

    // assert
    expect(columnHeaders()).toEqual([
      "Date",
      "Weight",
      "Waist",
      "Hips",
      "Thigh",
      "Arm",
      "Ratio",
    ]);
    expect(rowCells(1)).toEqual([
      "20 September",
      "68.4 kg",
      "76.5 cm",
      "98 cm",
      "57.3 cm",
      "—",
      "0.45",
    ]);
    expect(rowCells(2)).toEqual([
      "1 September",
      "70 kg",
      "80 cm",
      "100 cm",
      "—",
      "30 cm",
      "0.47",
    ]);
  });

  it("leaves the ratio out without a height", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="She has not sent any measurements yet."
        headingId="measurements-panel-heading"
        heightCm={null}
        measurements={HISTORY}
        perspective="coach"
        ratioHidden={false}
      />,
    );

    // assert
    expect(rowCells(1).at(-1)).toBe("—");
  });

  it("blanks every ratio while the client is pregnant or postpartum", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="She has not sent any measurements yet."
        headingId="measurements-panel-heading"
        heightCm={170}
        measurements={HISTORY}
        perspective="coach"
        ratioHidden
      />,
    );

    // assert
    expect(columnHeaders()).toContain("Ratio");
    expect([rowCells(1).at(-1), rowCells(2).at(-1)]).toEqual(["—", "—"]);
  });

  it("says she has not sent any measurements yet", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="She has not sent any measurements yet."
        headingId="measurements-panel-heading"
        heightCm={170}
        measurements={[]}
        perspective="coach"
        ratioHidden={false}
      />,
    );

    // assert
    expect(
      screen.getByText("She has not sent any measurements yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("the photos of an entry", () => {
  it("are offered once, only on an entry that has photos, without thumbnails", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={HISTORY}
        onViewPhotos={vi.fn()}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    const actions = screen.getAllByRole("button", { name: /^View photos/ });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName("View photos from 20 September");
    expect(actions[0]).toHaveTextContent("View photos");
    expect(columnHeaders().at(-1)).toBe("Actions");
    expect(rowCells(2).at(-1)).toBe("");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("open for the entry whose action she picks", async () => {
    // arrange
    const user = userEvent.setup();
    const onViewPhotos = vi.fn();
    render(
      <MeasurementsTable
        emptyMessage="She has not sent any measurements yet."
        headingId="measurements-panel-heading"
        heightCm={170}
        measurements={HISTORY}
        onViewPhotos={onViewPhotos}
        perspective="coach"
        ratioHidden={false}
      />,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "View photos from 20 September" }),
    );

    // assert
    expect(onViewPhotos).toHaveBeenCalledExactlyOnceWith(SECOND_SET);
  });

  it("leave the actions column out when no entry has photos", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={[FIRST_SET]}
        onViewPhotos={vi.fn()}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(columnHeaders()).not.toContain("Actions");
    expect(
      screen.queryByRole("button", { name: /^View photos/ }),
    ).not.toBeInTheDocument();
  });

  it("are not offered without a way to open them", () => {
    // arrange, act
    render(
      <MeasurementsTable
        emptyMessage="Nothing recorded yet."
        headingId="measurements-heading"
        measurements={HISTORY}
        perspective="client"
        units={METRIC}
      />,
    );

    // assert
    expect(columnHeaders()).not.toContain("Actions");
    expect(
      screen.queryByRole("button", { name: /^View photos/ }),
    ).not.toBeInTheDocument();
  });
});
