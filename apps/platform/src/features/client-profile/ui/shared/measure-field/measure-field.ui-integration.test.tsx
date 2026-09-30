// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  CIRCUMFERENCE_MEASUREMENT_FIELDS,
  WEIGHT_MEASUREMENT_FIELD,
  type MeasurementField,
} from "@eli-coach-platform/domain/measurement";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MeasureField } from "./measure-field";

const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };

const [WAIST_FIELD, HIPS_FIELD] = CIRCUMFERENCE_MEASUREMENT_FIELDS;

type ReadingValues = { reading: string };

function ReadingForm(props: {
  field: MeasurementField;
  onSave?: (values: ReadingValues) => void;
  reading?: string;
  units: MeasureUnits;
}) {
  const { control, handleSubmit } = useForm<ReadingValues>({
    defaultValues: { reading: props.reading ?? "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => props.onSave?.(values))}
    >
      <MeasureField
        control={control}
        field={props.field}
        name="reading"
        units={props.units}
      />
      <button type="submit">Save measurements</button>
    </form>
  );
}

afterEach(() => {
  cleanup();
});

describe("a measure field", () => {
  it("names the reading with its unit and describes how to take it", () => {
    // arrange, act
    render(<ReadingForm field={WEIGHT_MEASUREMENT_FIELD} units={METRIC} />);

    // assert
    const weight = screen.getByRole("spinbutton", {
      name: /^Weight\s*\(kg\)$/,
    });
    expect(weight).toHaveAccessibleDescription(
      "First thing in the morning, before eating, after the bathroom.",
    );
    expect(weight).toHaveAttribute("inputmode", "decimal");
    expect(weight).toHaveAttribute("step", "0.1");
    expect(weight).toHaveAttribute("min", "30");
    expect(weight).toHaveAttribute("max", "300");
  });

  it("marks an optional reading and takes it in her units", () => {
    // arrange, act
    render(<ReadingForm field={HIPS_FIELD} units={IMPERIAL} />);

    // assert
    const hips = screen.getByRole("spinbutton", {
      name: /^Hips\s*\(in\)\s*\(optional\)$/,
    });
    expect(hips).toHaveAttribute("step", "0.25");
    expect(hips).toHaveAttribute("min", "20");
    expect(hips).toHaveAttribute("max", "79");
  });

  it("shows the reading she already has", () => {
    // arrange, act
    render(<ReadingForm field={WAIST_FIELD} reading="76.5" units={METRIC} />);

    // assert
    expect(
      screen.getByRole("spinbutton", { name: /^Waist\s*\(cm\)$/ }),
    ).toHaveValue(76.5);
  });

  it("asks for a required reading she left empty", async () => {
    // arrange
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ReadingForm
        field={WEIGHT_MEASUREMENT_FIELD}
        onSave={onSave}
        units={METRIC}
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Save measurements" }));

    // assert
    const weight = screen.getByRole("spinbutton", { name: /Weight/ });
    expect(weight).toBeInvalid();
    expect(weight).toHaveAccessibleDescription(
      "First thing in the morning, before eating, after the bathroom. Enter a weight.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("turns down a reading outside the range in her units", async () => {
    // arrange
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ReadingForm
        field={WEIGHT_MEASUREMENT_FIELD}
        onSave={onSave}
        units={IMPERIAL}
      />,
    );

    // act
    await user.type(screen.getByRole("spinbutton", { name: /Weight/ }), "700");
    await user.click(screen.getByRole("button", { name: "Save measurements" }));

    // assert
    expect(
      screen.getByText("Enter a weight between 66 and 661 lb."),
    ).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("lets an optional reading stay empty", async () => {
    // arrange
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ReadingForm field={HIPS_FIELD} onSave={onSave} units={METRIC} />);

    // act
    await user.click(screen.getByRole("button", { name: "Save measurements" }));

    // assert
    expect(onSave).toHaveBeenCalledWith({ reading: "" });
    expect(screen.getByRole("spinbutton", { name: /Hips/ })).not.toBeInvalid();
  });

  it("saves a reading inside the range", async () => {
    // arrange
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ReadingForm field={WAIST_FIELD} onSave={onSave} units={IMPERIAL} />,
    );

    // act
    await user.type(screen.getByRole("spinbutton", { name: /Waist/ }), "30");
    await user.click(screen.getByRole("button", { name: "Save measurements" }));

    // assert
    expect(onSave).toHaveBeenCalledWith({ reading: "30" });
  });
});
