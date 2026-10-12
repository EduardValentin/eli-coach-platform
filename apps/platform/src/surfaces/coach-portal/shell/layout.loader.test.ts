import { describe, expect, it, vi } from "vitest";

import type { CheckInsFeature } from "~/features/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./layout";

describe("coach shell loader", () => {
  it("counts the check-ins waiting for the coach's answer", async () => {
    // arrange
    const loadAwaitingCount = vi.fn().mockResolvedValue(4);
    const args = createRequestArgs({
      contexts: [
        contextEntry(checkInsContext, {
          coachCheckIns: { loadAwaitingCount },
        } as unknown as CheckInsFeature),
      ],
      request: new Request("https://evoa.fit/coach"),
    });

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({ checkInsAwaiting: 4 });
    expect(loadAwaitingCount).toHaveBeenCalledWith(args);
  });
});
