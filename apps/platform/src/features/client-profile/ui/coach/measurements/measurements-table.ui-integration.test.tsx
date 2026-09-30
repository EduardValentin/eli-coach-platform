// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MeasurementsTable } from "./measurements-table";

const MEASUREMENTS = [
  {
    armCm: 30,
    hipsCm: 100.04,
    recordedAt: "2026-09-01T10:00:00.000Z",
    thighCm: null,
    waistCm: 80,
    weightKg: 70,
  },
  {
    armCm: null,
    hipsCm: 98,
    recordedAt: "2026-09-20T10:00:00.000Z",
    thighCm: 57.25,
    waistCm: 76.5,
    weightKg: 68.44,
  },
];

afterEach(() => {
  cleanup();
});

describe("the measurements table on a client page", () => {
  it("says she has not sent any measurements yet", () => {
    // arrange, act
    render(
      <MeasurementsTable gender="female" heightCm={170} measurements={[]} />,
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Measurements" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("She has not sent any measurements yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says he has not sent any measurements yet", () => {
    // arrange, act
    render(
      <MeasurementsTable gender="male" heightCm={170} measurements={[]} />,
    );

    // assert
    expect(
      screen.getByText("He has not sent any measurements yet."),
    ).toBeInTheDocument();
  });

  it("says they have not sent any measurements yet", () => {
    // arrange, act
    render(
      <MeasurementsTable
        gender="prefer_not_to_say"
        heightCm={170}
        measurements={[]}
      />,
    );

    // assert
    expect(
      screen.getByText("They have not sent any measurements yet."),
    ).toBeInTheDocument();
  });

  it("lists her measurements newest first in kg and cm with the ratio", () => {
    // arrange, act
    render(
      <MeasurementsTable
        gender="female"
        heightCm={170}
        measurements={MEASUREMENTS}
      />,
    );

    // assert
    const table = screen.getByRole("table", {
      name: "Measurements history, newest first",
    });
    const rows = within(table).getAllByRole("row");
    expect(
      within(rows[0])
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Date", "Weight", "Waist", "Hips", "Thigh", "Arm", "Ratio"]);
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([
      "20 September",
      "68.4 kg",
      "76.5 cm",
      "98 cm",
      "57.3 cm",
      "—",
      "0.45",
    ]);
    expect(
      within(rows[2])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual([
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
        gender="female"
        heightCm={null}
        measurements={MEASUREMENTS}
      />,
    );

    // assert
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getAllByRole("cell").at(-1)).toHaveTextContent("—");
  });
});
