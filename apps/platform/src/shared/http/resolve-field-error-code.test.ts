import { describe, expect, it } from "vitest";

import { resolveFieldErrorCode } from "./resolve-field-error-code";

const CODES_BY_FIELD = {
  email: "invalid_email",
  fullName: "invalid_name",
} as const;

describe("resolveFieldErrorCode", () => {
  it("answers the code for the field named earliest among the recognised codes", () => {
    // arrange
    const issues = [{ path: ["fullName"] }, { path: ["email"] }];

    // act
    const code = resolveFieldErrorCode(issues, CODES_BY_FIELD, "server_error");

    // assert
    expect(code).toBe("invalid_email");
  });

  it("answers the fallback when no issue names a recognised field", () => {
    // arrange
    const issues = [{ path: ["notes"] }];

    // act
    const code = resolveFieldErrorCode(issues, CODES_BY_FIELD, "server_error");

    // assert
    expect(code).toBe("server_error");
  });

  it("answers the fallback for an empty issue list", () => {
    // arrange, act
    const code = resolveFieldErrorCode([], CODES_BY_FIELD, "server_error");

    // assert
    expect(code).toBe("server_error");
  });
});
