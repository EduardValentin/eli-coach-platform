import { describe, expect, it, vi } from "vitest";

import { CancelCheckInsAfterCoachingEndUseCase } from "./cancel-check-ins-after-coaching-end-use-case";
import type { CheckIns } from "./check-ins";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const COACHING_ENDS_AT = new Date("2026-07-01T10:00:00.000Z");

function createCancelAfterEnd(cancelled: string[]) {
  const checkIns = {
    cancelFrom: vi.fn().mockResolvedValue({ cancelled }),
  } satisfies Pick<CheckIns, "cancelFrom">;

  return {
    checkIns,
    cancelAfterEnd: new CancelCheckInsAfterCoachingEndUseCase({
      checkIns,
      clock: { now: () => NOW },
    }),
  };
}

describe("CancelCheckInsAfterCoachingEndUseCase", () => {
  it("cancels the client's check-ins from her coaching end at the clock's instant", async () => {
    // arrange
    const { cancelAfterEnd, checkIns } = createCancelAfterEnd([
      "check-in-2",
      "check-in-3",
    ]);

    // act
    const result = await cancelAfterEnd.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 2 });
    expect(checkIns.cancelFrom).toHaveBeenCalledWith({
      clientId: "client-1",
      from: COACHING_ENDS_AT,
      at: NOW,
    });
  });

  it("cancels nothing again once her later check-ins are cancelled", async () => {
    // arrange
    const { cancelAfterEnd } = createCancelAfterEnd([]);

    // act
    const result = await cancelAfterEnd.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 0 });
  });
});
