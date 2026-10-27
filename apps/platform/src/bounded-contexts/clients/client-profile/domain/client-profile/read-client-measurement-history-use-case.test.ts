import { describe, expect, it, vi } from "vitest";

import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { MeasurementRecord } from "./measurement-history";
import { ReadClientMeasurementHistoryUseCase } from "./read-client-measurement-history-use-case";

const FIRST: MeasurementRecord = {
  id: "entry-1",
  recordedAt: new Date("2026-09-20T08:00:00.000Z"),
  weightKg: 68,
  waistCm: 72,
  photos: [],
};
const LATEST: MeasurementRecord = {
  id: "entry-2",
  recordedAt: new Date("2026-09-27T08:00:00.000Z"),
  weightKg: 67.4,
  waistCm: 71,
  hipsCm: 97,
  photos: [],
};

describe("ReadClientMeasurementHistoryUseCase", () => {
  it("reads a client's history newest first for her coach", async () => {
    // arrange
    const records = {
      listByClientId: vi.fn().mockResolvedValue([FIRST, LATEST]),
      record: vi.fn(),
    } satisfies ClientMeasurementRecords;
    const useCase = new ReadClientMeasurementHistoryUseCase({ records });

    // act
    const history = await useCase.execute({ clientId: "client-1" });

    // assert
    expect(history.newestFirst()).toEqual([LATEST, FIRST]);
    expect(records.listByClientId).toHaveBeenCalledWith("client-1");
  });
});
