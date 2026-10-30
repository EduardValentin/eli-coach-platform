import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { ReadClientCheckInSchedulingUseCase } from "./read-client-check-in-scheduling-use-case";

function createReadScheduling(client: ClientReachReading | null) {
  const clients = {
    findById: vi.fn().mockResolvedValue(client),
  } satisfies Pick<ClientReachPort, "findById">;

  return {
    clients,
    readClientCheckInSchedulingUseCase: new ReadClientCheckInSchedulingUseCase({
      clientReachPort: clients,
    }),
  };
}

describe("ReadClientCheckInSchedulingUseCase", () => {
  it.each([
    { portal: "reachable", scheduling: "allowed" },
    { portal: "awaiting_onboarding", scheduling: "awaiting_onboarding" },
    { portal: "ended", scheduling: "ended" },
  ] as const)(
    "answers $scheduling for a client whose portal reach is $portal",
    async ({ portal, scheduling }) => {
      // arrange
      const { readClientCheckInSchedulingUseCase, clients } =
        createReadScheduling({
          clientId: "client-1",
          portal,
          coachingEndsAt: null,
          programStartsAt: null,
          paidThrough: null,
          timeZone: "Europe/London",
        });

      // act
      const result =
        await readClientCheckInSchedulingUseCase.execute("client-1");

      // assert
      expect(result).toBe(scheduling);
      expect(clients.findById).toHaveBeenCalledWith("client-1");
    },
  );

  it("answers unknown for a client with no record", async () => {
    // arrange
    const { readClientCheckInSchedulingUseCase } = createReadScheduling(null);

    // act
    const result =
      await readClientCheckInSchedulingUseCase.execute("client-404");

    // assert
    expect(result).toBe("unknown");
  });
});
