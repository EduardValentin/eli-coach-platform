import { describe, expect, it } from "vitest";

import { fetcherOutcomeOf } from "./fetcher-outcome";

describe("fetcherOutcomeOf", () => {
  it("passes the server action's answer through", async () => {
    // arrange
    const answer = { recorded: true };

    // act
    const outcome = await fetcherOutcomeOf(() => Promise.resolve(answer));

    // assert
    expect(outcome).toBe(answer);
  });

  it("answers a refusal the server threw with its status", async () => {
    // arrange
    const thrownRefusal = new Response("Unauthorized", { status: 401 });

    // act
    const outcome = await fetcherOutcomeOf(() => Promise.reject(thrownRefusal));

    // assert
    expect(outcome).toBeInstanceOf(Response);
    const response = outcome as Response;
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      httpStatus: 401,
      status: "refused",
    });
  });

  it("answers an unreachable server as unavailable", async () => {
    // arrange
    const networkFailure = new TypeError("Failed to fetch");

    // act
    const outcome = await fetcherOutcomeOf(() =>
      Promise.reject(networkFailure),
    );

    // assert
    expect(outcome).toBeInstanceOf(Response);
    const response = outcome as Response;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unreachable" });
  });
});
