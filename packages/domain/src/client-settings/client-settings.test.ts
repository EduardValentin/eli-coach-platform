import { describe, expect, it } from "vitest";

import { ClientSettings, type ClientSettingsSnapshot } from "./client-settings";
import { UnitPreference } from "./unit-preference";

const OPENED_AT = new Date("2026-10-24T08:00:00.000Z");
const SAVED_AT = new Date("2026-10-24T09:30:00.000Z");

const SEEDED: ClientSettingsSnapshot = {
  clientId: "client-1",
  unitPreference: { weightUnit: "kg", heightUnit: "cm" },
  preferredCheckInWeekday: "monday",
  preferredChannel: "whatsapp",
  updatedAt: OPENED_AT,
};

describe("ClientSettings.opened", () => {
  it("opens her settings at admission in metric units with no preferences yet", () => {
    // arrange
    const input = { clientId: "client-1", now: OPENED_AT };

    // act
    const settings = ClientSettings.opened(input);

    // assert
    expect(settings.toSnapshot()).toEqual({
      clientId: "client-1",
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
      preferredCheckInWeekday: null,
      preferredChannel: null,
      updatedAt: OPENED_AT,
    });
  });
});

describe("ClientSettings#withUnits", () => {
  it("changes her units at the moment she saves them and keeps her preferences", () => {
    // arrange
    const settings = ClientSettings.reconstitute(SEEDED);

    // act
    const changed = settings.withUnits(UnitPreference.of("imperial"), SAVED_AT);

    // assert
    expect(changed.toSnapshot()).toEqual({
      ...SEEDED,
      unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
      updatedAt: SAVED_AT,
    });
    expect(settings.toSnapshot()).toEqual(SEEDED);
  });
});

describe("ClientSettings#unitPreference", () => {
  it("reads her units as a unit preference", () => {
    // arrange
    const settings = ClientSettings.reconstitute({
      ...SEEDED,
      unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
    });

    // act
    const preference = settings.unitPreference();

    // assert
    expect(preference.measurementSystem()).toBe("imperial");
  });
});

describe("ClientSettings#toSnapshot", () => {
  it("hands back plain data that rebuilds the same settings", () => {
    // arrange
    const settings = ClientSettings.reconstitute(SEEDED);

    // act
    const snapshot = settings.toSnapshot();

    // assert
    expect(ClientSettings.reconstitute(snapshot).toSnapshot()).toEqual(SEEDED);
    expect(Object.getPrototypeOf(snapshot.unitPreference)).toBe(
      Object.prototype,
    );
  });
});
