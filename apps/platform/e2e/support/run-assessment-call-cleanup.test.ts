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

  it("deletes the run's check-in reservations, then its check-ins, before any client", async () => {
    // arrange
    const reservations =
      /delete from app\.coach_time_reservations[\s\S]*'check_in'/;
    const checkIns = /delete from app\.check_ins/;
    const clients = /delete from app\.clients/;

    // act
    const result = await cleanUpRunAssessmentCalls(RUN_ID, "[test]");

    // assert
    expect(result).toEqual({ allCleaned: true });
    expect(positionOf(reservations)).toBeGreaterThan(-1);
    expect(positionOf(reservations)).toBeLessThan(positionOf(checkIns));
    expect(positionOf(checkIns)).toBeLessThan(positionOf(clients));
  });

  it("removes only check_in reservations of the run's clients' check-ins", async () => {
    // arrange
    const reservations =
      /delete from app\.coach_time_reservations[\s\S]*'check_in'/;

    // act
    await cleanUpRunAssessmentCalls(RUN_ID, "[test]");

    // assert
    const statement = issued.statements[positionOf(reservations)] ?? "";
    expect(statement).toMatch(/appointment_kind = 'check_in'/);
    expect(statement).toMatch(/from app\.check_ins/);
    expect(statement).toMatch(/assessment_call_id = any\(\$1::uuid\[\]\)/);
  });

  it("still deletes the assessment-call reservations after the clients", async () => {
    // arrange
    const callReservations =
      /delete from app\.coach_time_reservations[\s\S]*'assessment_call'/;
    const clients = /delete from app\.clients/;

    // act
    await cleanUpRunAssessmentCalls(RUN_ID, "[test]");

    // assert
    expect(positionOf(callReservations)).toBeGreaterThan(positionOf(clients));
  });
});
