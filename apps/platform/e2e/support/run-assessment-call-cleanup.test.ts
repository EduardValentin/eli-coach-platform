import { beforeEach, describe, expect, it, vi } from "vitest";

import { cleanUpRunAssessmentCalls } from "./assessment-calls";

const RUN_ID = "run1";
const issued = vi.hoisted(() => ({ statements: [] as string[] }));

vi.mock("./database", () => ({
  createE2eDatabasePool: () => ({
    connect: async () => ({
      query: async (statement: string) => {
        issued.statements.push(statement);

        return { rows: [{ id: "row-1" }], rowCount: 1 };
      },
      release: () => undefined,
    }),
    end: async () => undefined,
  }),
}));
vi.mock("./clerk-users", () => ({
  isClerkTestEmail: () => true,
  readCreatedEmails: () => ["e2e-run1-0-1+clerk_test@evoa.fit"],
}));
vi.mock("./client-resource-files", () => ({
  removeClientResourceFilesOf: () => 0,
}));
vi.mock("./progress-photo-files", () => ({
  removeProgressPhotoFilesOf: () => 0,
}));

function positionOf(fragment: RegExp): number {
  return issued.statements.findIndex((statement) => fragment.test(statement));
}

describe("cleanUpRunAssessmentCalls", () => {
  beforeEach(() => {
    issued.statements.length = 0;
  });

  it("deletes the run's check-ins before any client", async () => {
    // arrange
    const checkIns = /delete from app\.check_ins/;
    const clients = /delete from app\.clients/;

    // act
    const result = await cleanUpRunAssessmentCalls(RUN_ID, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(positionOf(checkIns)).toBeGreaterThan(-1);
    expect(positionOf(checkIns)).toBeLessThan(positionOf(clients));
  });

  it("leaves the coach's reserved time to go with the calls and check-ins it belongs to", async () => {
    // arrange
    const reservations = /delete from app\.coach_time_reservations/;

    // act
    await cleanUpRunAssessmentCalls(RUN_ID, "[test]");

    // assert
    expect(positionOf(reservations)).toBe(-1);
  });
});
