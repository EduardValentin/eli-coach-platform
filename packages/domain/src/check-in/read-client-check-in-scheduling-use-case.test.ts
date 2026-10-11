import { describe, expect, it, vi } from "vitest";

import type {
  CheckInClientReference,
  CheckInClients,
} from "./check-in-clients";
import { ReadClientCheckInSchedulingUseCase } from "./read-client-check-in-scheduling-use-case";

function createReadScheduling(client: CheckInClientReference | null) {
  const clients = {
    findById: vi.fn().mockResolvedValue(client),
  } satisfies Pick<CheckInClients, "findById">;

  return {
    clients,
    readScheduling: new ReadClientCheckInSchedulingUseCase({ clients }),
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
      const { readScheduling, clients } = createReadScheduling({
        clientId: "client-1",
        portal,
        bookingTimeZone: "Europe/London",
      });

      // act
      const result = await readScheduling.execute("client-1");

      // assert
      expect(result).toBe(scheduling);
      expect(clients.findById).toHaveBeenCalledWith("client-1");
    },
  );

  it("answers unknown for a client with no record", async () => {
    // arrange
    const { readScheduling } = createReadScheduling(null);

    // act
    const result = await readScheduling.execute("client-404");

    // assert
    expect(result).toBe("unknown");
  });
});
