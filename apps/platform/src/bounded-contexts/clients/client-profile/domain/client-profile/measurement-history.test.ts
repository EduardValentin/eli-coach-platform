import { describe, expect, it } from "vitest";

import {
  MeasurementHistory,
  MEASUREMENTS_CADENCE_DAYS,
  WEIGH_IN_CADENCE_DAYS,
  type MeasurementRecord,
} from "./measurement-history";
import type { ProgressPhotoSnapshot } from "./progress-photo";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const FIRST_AT = new Date("2026-09-01T08:00:00.000Z");

function daysAfter(start: Date, days: number): Date {
  return new Date(start.getTime() + days * MILLISECONDS_PER_DAY);
}

function weighIn(id: string, recordedAt: Date): MeasurementRecord {
  return { id, recordedAt, weightKg: 68, waistCm: 72, photos: [] };
}

function withHips(record: MeasurementRecord): MeasurementRecord {
  return { ...record, hipsCm: 98 };
}

function photoOf(entryId: string): ProgressPhotoSnapshot {
  return {
    id: `${entryId}-front`,
    entryId,
    clientId: "client-1",
    view: "front",
    reference: { storageKey: `client-1/${entryId}/front.bin`, keyId: "k1" },
    mimeType: "image/jpeg",
    sizeBytes: 120_000,
    createdAt: FIRST_AT,
  };
}

describe("MeasurementHistory", () => {
  it("lists her entries newest first and knows the latest", () => {
    // arrange
    const first = weighIn("entry-1", FIRST_AT);
    const latest = weighIn("entry-3", daysAfter(FIRST_AT, 14));
    const between = weighIn("entry-2", daysAfter(FIRST_AT, 7));

    // act
    const history = MeasurementHistory.of([first, latest, between]);

    // assert
    expect(history.newestFirst()).toEqual([latest, between, first]);
    expect(history.latest()).toEqual(latest);
    expect(history.toSnapshot()).toEqual({
      records: [latest, between, first],
    });
  });

  it("is empty with no latest entry when she has recorded nothing", () => {
    // arrange, act
    const history = MeasurementHistory.of([]);

    // assert
    expect(history.newestFirst()).toEqual([]);
    expect(history.latest()).toBeNull();
  });
});

describe("MeasurementHistory#dueLine", () => {
  it("asks for nothing when she has recorded nothing", () => {
    // arrange
    const history = MeasurementHistory.of([]);

    // act
    const line = history.dueLine(FIRST_AT);

    // assert
    expect(line).toBeNull();
  });

  it("asks for nothing within a week of her latest entry", () => {
    // arrange
    const history = MeasurementHistory.of([weighIn("entry-1", FIRST_AT)]);

    // act
    const line = history.dueLine(daysAfter(FIRST_AT, 6));

    // assert
    expect(line).toBeNull();
  });

  it("asks for her weekly weigh-in seven days after her latest entry", () => {
    // arrange
    const history = MeasurementHistory.of([weighIn("entry-1", FIRST_AT)]);

    // act
    const line = history.dueLine(daysAfter(FIRST_AT, WEIGH_IN_CADENCE_DAYS));

    // assert
    expect(WEIGH_IN_CADENCE_DAYS).toBe(7);
    expect(line).toBe("weigh-in");
  });

  it("asks for measurements 28 days after her first entry when no entry carries hips, thigh, arm or a photo", () => {
    // arrange
    const history = MeasurementHistory.of([
      weighIn("entry-1", FIRST_AT),
      weighIn("entry-2", daysAfter(FIRST_AT, 21)),
    ]);

    // act
    const line = history.dueLine(
      daysAfter(FIRST_AT, MEASUREMENTS_CADENCE_DAYS),
    );

    // assert
    expect(MEASUREMENTS_CADENCE_DAYS).toBe(28);
    expect(line).toBe("measurements");
  });

  it("counts from her latest entry with hips, thigh or arm", () => {
    // arrange
    const fullSetAt = daysAfter(FIRST_AT, 10);
    const history = MeasurementHistory.of([
      withHips(weighIn("entry-1", FIRST_AT)),
      { ...weighIn("entry-2", fullSetAt), thighCm: 55 },
      weighIn("entry-3", daysAfter(FIRST_AT, 34)),
    ]);

    // act
    const beforeDue = history.dueLine(daysAfter(fullSetAt, 27));
    const due = history.dueLine(daysAfter(fullSetAt, 28));

    // assert
    expect(beforeDue).toBeNull();
    expect(due).toBe("measurements");
  });

  it("counts an entry with only a photo as her measurements", () => {
    // arrange
    const photoAt = daysAfter(FIRST_AT, 10);
    const history = MeasurementHistory.of([
      withHips(weighIn("entry-1", FIRST_AT)),
      { ...weighIn("entry-2", photoAt), photos: [photoOf("entry-2")] },
      weighIn("entry-3", daysAfter(FIRST_AT, 34)),
    ]);

    // act
    const line = history.dueLine(daysAfter(photoAt, 27));

    // assert
    expect(line).toBeNull();
  });

  it("asks for measurements rather than the weigh-in when both are due", () => {
    // arrange
    const history = MeasurementHistory.of([
      withHips(weighIn("entry-1", FIRST_AT)),
    ]);

    // act
    const line = history.dueLine(daysAfter(FIRST_AT, 40));

    // assert
    expect(line).toBe("measurements");
  });
});
