import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "../client-reach-port";

import { ClientSettings } from "./client-settings";
import type { ClientSettingsSourcePort } from "./client-settings-source-port";
import { ReadOwnClientSettingsUseCase } from "./read-own-client-settings-use-case";

const OPENED_AT = new Date("2026-09-20T08:00:00.000Z");

const REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/Bucharest",
};

const SEEDED = ClientSettings.reconstitute({
  clientId: "client-1",
  unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
  preferredCheckInWeekday: "friday",
  preferredChannel: "email",
  updatedAt: OPENED_AT,
});

function createUseCase(input: {
  reach: ClientReachReading | null;
  stored: ClientSettings | null;
}) {
  const ports = {
    clientReachPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(input.reach),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId">,
    clientSettingsSourcePort: {
      findByClientId: vi.fn().mockResolvedValue(input.stored),
    } satisfies ClientSettingsSourcePort,
  };

  return {
    ports,
    readOwnClientSettingsUseCase: new ReadOwnClientSettingsUseCase(ports),
  };
}

describe("ReadOwnClientSettingsUseCase", () => {
  it("reads her units and preferences", async () => {
    // arrange
    const { ports, readOwnClientSettingsUseCase } = createUseCase({
      reach: REACH,
      stored: SEEDED,
    });

    // act
    const settings = await readOwnClientSettingsUseCase.execute("user_ana");

    // assert
    expect(settings).toEqual(SEEDED.toSnapshot());
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(ports.clientSettingsSourcePort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
  });

  it("reads nothing for a client with no stored settings", async () => {
    // arrange
    const { readOwnClientSettingsUseCase } = createUseCase({
      reach: REACH,
      stored: null,
    });

    // act
    const settings = await readOwnClientSettingsUseCase.execute("user_ana");

    // assert
    expect(settings).toBeNull();
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const { ports, readOwnClientSettingsUseCase } = createUseCase({
      reach: null,
      stored: null,
    });

    // act
    const settings =
      await readOwnClientSettingsUseCase.execute("user_stranger");

    // assert
    expect(settings).toBeNull();
    expect(
      ports.clientSettingsSourcePort.findByClientId,
    ).not.toHaveBeenCalled();
  });
});
