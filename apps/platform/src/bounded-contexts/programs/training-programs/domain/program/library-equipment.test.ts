import { describe, expect, it } from "vitest";

import { LibraryEquipment } from "./library-equipment";
import { EQUIPMENT } from "./library-exercise";

describe("LibraryEquipment coveredBy", () => {
  it("lists every library item for a full gym", () => {
    // act
    const equipment = LibraryEquipment.coveredBy(["Full gym"]);

    // assert
    expect(equipment).toEqual([...EQUIPMENT]);
  });

  it("maps her equipment to library items without repeats", () => {
    // act
    const equipment = LibraryEquipment.coveredBy([
      "Barbell",
      "Dumbbells",
      "Resistance bands",
    ]);

    // assert
    expect(equipment).toEqual([
      "Barbell",
      "Squat rack",
      "Bench",
      "EZ bar",
      "Trap bar",
      "Dumbbells",
      "Bands",
    ]);
  });

  it("has no library items for bodyweight only", () => {
    // act
    const equipment = LibraryEquipment.coveredBy(["Bodyweight only"]);

    // assert
    expect(equipment).toEqual([]);
  });
});
