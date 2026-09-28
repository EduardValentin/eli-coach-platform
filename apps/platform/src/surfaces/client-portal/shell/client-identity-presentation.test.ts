import { describe, expect, it } from "vitest";

import { presentClientIdentity } from "./client-identity-presentation";

describe("presentClientIdentity", () => {
  it("names the client in full and greets her by her first name", () => {
    // arrange
    const identity = { firstName: "Ana", lastName: "Popescu" };

    // act
    const presentation = presentClientIdentity(identity);

    // assert
    expect(presentation).toEqual({
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    });
  });

  it("names a client with no last name by her first name alone", () => {
    // arrange
    const identity = { firstName: "Ana", lastName: "" };

    // act
    const presentation = presentClientIdentity(identity);

    // assert
    expect(presentation).toEqual({
      displayName: "Ana",
      greeting: "Welcome back, Ana.",
    });
  });

  it("falls back to a quiet greeting for an account with no client record", () => {
    // arrange
    const identity = null;

    // act
    const presentation = presentClientIdentity(identity);

    // assert
    expect(presentation).toEqual({
      displayName: "Client",
      greeting: "Welcome back.",
    });
  });
});
