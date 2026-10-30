import { describe, expect, it } from "vitest";
import { FeatureFlag } from "./feature-flag";

describe("FeatureFlag", () => {
  it("reconstitutes a feature flag from persisted data", () => {
    // arrange
    const createdAt = new Date("2026-01-01");
    const updatedAt = new Date("2026-01-02");
    const props = {
      id: 1,
      name: "CLIENT_PORTAL",
      enabled: true,
      description: "Controls access to the client portal.",
      createdAt,
      updatedAt,
    };

    // act
    const flag = FeatureFlag.reconstitute(props);

    // assert
    expect(flag.id).toBe(1);
    expect(flag.name).toBe("CLIENT_PORTAL");
    expect(flag.enabled).toBe(true);
    expect(flag.description).toBe("Controls access to the client portal.");
    expect(flag.createdAt).toBe(createdAt);
    expect(flag.updatedAt).toBe(updatedAt);
  });

  it("toSet converts a list of flags to a set object", () => {
    // arrange
    const createdAt = new Date("2026-01-01");
    const updatedAt = new Date("2026-01-02");
    const on = FeatureFlag.reconstitute({
      id: 1,
      name: "CLIENT_PORTAL",
      enabled: true,
      description: null,
      createdAt,
      updatedAt,
    });
    const off = FeatureFlag.reconstitute({
      id: 2,
      name: "COACH_PORTAL",
      enabled: false,
      description: null,
      createdAt,
      updatedAt,
    });

    // act
    const set = FeatureFlag.toSet([on, off]);

    // assert
    expect(set).toEqual({
      CLIENT_PORTAL: true,
      COACH_PORTAL: false,
    });
  });

  it("toSet returns empty object for empty list", () => {
    // act
    const set = FeatureFlag.toSet([]);

    // assert
    expect(set).toEqual({});
  });
});
