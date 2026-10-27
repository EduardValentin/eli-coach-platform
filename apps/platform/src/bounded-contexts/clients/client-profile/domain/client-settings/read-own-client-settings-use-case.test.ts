import { describe, expect, it, vi } from "vitest";

import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";

import { ClientSettings } from "./client-settings";
import type { ClientSettingsSource } from "./client-settings-source";
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
    clients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(input.reach),
    } satisfies Pick<ClientReach, "findByAuthSubjectId">,
    settings: {
      findByClientId: vi.fn().mockResolvedValue(input.stored),
    } satisfies ClientSettingsSource,
  };

  return { ports, useCase: new ReadOwnClientSettingsUseCase(ports) };
}

describe("ReadOwnClientSettingsUseCase", () => {
  it("reads her units and preferences", async () => {
    // arrange
    const { ports, useCase } = createUseCase({ reach: REACH, stored: SEEDED });

    // act
    const settings = await useCase.execute("user_ana");

    // assert
    expect(settings).toEqual(SEEDED.toSnapshot());
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.settings.findByClientId).toHaveBeenCalledWith("client-1");
  });

  it("reads nothing for a client with no stored settings", async () => {
    // arrange
    const { useCase } = createUseCase({ reach: REACH, stored: null });

    // act
    const settings = await useCase.execute("user_ana");

    // assert
    expect(settings).toBeNull();
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const { ports, useCase } = createUseCase({ reach: null, stored: null });

    // act
    const settings = await useCase.execute("user_stranger");

    // assert
    expect(settings).toBeNull();
    expect(ports.settings.findByClientId).not.toHaveBeenCalled();
  });
});
