import { describe, expect, it, vi } from "vitest";

import { CancelCheckInsAfterCoachingEndUseCase } from "./cancel-check-ins-after-coaching-end-use-case";
import type { CheckInsPort, CheckInsAtCoachingEnd } from "./check-ins-port";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const COACHING_ENDS_AT = new Date("2026-07-01T10:00:00.000Z");

function createCancelAfterEnd(ended: CheckInsAtCoachingEnd) {
  const checkIns = {
    endCoaching: vi.fn().mockResolvedValue(ended),
  } satisfies Pick<CheckInsPort, "endCoaching">;
  const coachTime = { release: vi.fn().mockResolvedValue(undefined) };
  const inbox = { scheduleExpiries: vi.fn().mockResolvedValue(undefined) };

  return {
    checkIns,
    coachTime,
    inbox,
    cancelCheckInsAfterCoachingEndUseCase:
      new CancelCheckInsAfterCoachingEndUseCase({
        checkInsPort: checkIns,
        clockPort: { now: () => NOW },
        coachTimePort: coachTime,
        checkInInboxPort: inbox,
        checkInIncidentsPort: { checkInInboxFailed: vi.fn() },
      }),
  };
}

describe("CancelCheckInsAfterCoachingEndUseCase", () => {
  it("ends the client's check-ins from her coaching end at the clock's instant, stopping her weekly series", async () => {
    // arrange
    const { cancelCheckInsAfterCoachingEndUseCase, checkIns, coachTime } =
      createCancelAfterEnd({
        cancelled: ["check-in-2", "check-in-3"],
        seriesStopped: true,
        freedReservationIds: ["reservation-2", "reservation-3"],
      });

    // act
    const result = await cancelCheckInsAfterCoachingEndUseCase.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 2, seriesStopped: true });
    expect(coachTime.release).toHaveBeenCalledWith("reservation-2");
    expect(coachTime.release).toHaveBeenCalledWith("reservation-3");
    expect(checkIns.endCoaching).toHaveBeenCalledWith({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
      at: NOW,
    });
  });

  it("cancels nothing again once her later check-ins are cancelled and her series stopped", async () => {
    // arrange
    const { cancelCheckInsAfterCoachingEndUseCase } = createCancelAfterEnd({
      cancelled: [],
      seriesStopped: false,
      freedReservationIds: [],
    });

    // act
    const result = await cancelCheckInsAfterCoachingEndUseCase.execute({
      clientId: "client-1",
      endsAt: COACHING_ENDS_AT,
    });

    // assert
    expect(result).toEqual({ cancelled: 0, seriesStopped: false });
  });
});
