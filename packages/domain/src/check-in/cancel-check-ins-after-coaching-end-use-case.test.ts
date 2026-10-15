import { describe, expect, it, vi } from "vitest";

import { CancelCheckInsAfterCoachingEndUseCase } from "./cancel-check-ins-after-coaching-end-use-case";
import type { CheckIns, CheckInsAtCoachingEnd } from "./check-ins";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const COACHING_ENDS_AT = new Date("2026-07-01T10:00:00.000Z");

function createCancelAfterEnd(ended: CheckInsAtCoachingEnd) {
  const checkIns = {
    endCoaching: vi.fn().mockResolvedValue(ended),
  } satisfies Pick<CheckIns, "endCoaching">;

  return {
    checkIns,
    cancelAfterEnd: new CancelCheckInsAfterCoachingEndUseCase({
      checkIns,
      clock: { now: () => NOW },
    }),
  };
}

describe("CancelCheckInsAfterCoachingEndUseCase", () => {
  it("ends the client's check-ins from her coaching end at the clock's instant, stopping her weekly series", async () => {
    // arrange
    const { cancelAfterEnd, checkIns } = createCancelAfterEnd({
      cancelled: ["check-in-2", "check-in-3"],
      seriesStopped: true,
    });

    // act
    const result = await cancelAfterEnd.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 2, seriesStopped: true });
    expect(checkIns.endCoaching).toHaveBeenCalledWith({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
      at: NOW,
    });
  });

  it("cancels nothing again once her later check-ins are cancelled and her series stopped", async () => {
    // arrange
    const { cancelAfterEnd } = createCancelAfterEnd({
      cancelled: [],
      seriesStopped: false,
    });

    // act
    const result = await cancelAfterEnd.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 0, seriesStopped: false });
  });
});
