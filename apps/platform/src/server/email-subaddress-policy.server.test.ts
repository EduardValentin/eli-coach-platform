import { describe, expect, it } from "vitest";

import { resolveEmailSubaddressPolicy } from "./email-subaddress-policy.server";

describe("resolveEmailSubaddressPolicy", () => {
  it.each([
    ["a local development server", "local", "development", "allowed"],
    ["a production build run locally", "local", "production", "allowed"],
    ["the integration test runtime", "test", "test", "allowed"],
    ["the TEST deploy", "test", "production", "allowed"],
    ["production", "production", "production", "refused"],
  ] as const)(
    "answers %s (ENVIRONMENT=%s, NODE_ENV=%s) with %s",
    (_runtime, environmentName, nodeEnvironment, expected) => {
      // arrange
      const environment = {
        ENVIRONMENT: environmentName,
        NODE_ENV: nodeEnvironment,
      };

      // act
      const policy = resolveEmailSubaddressPolicy(environment);

      // assert
      expect(policy).toBe(expected);
    },
  );
});
