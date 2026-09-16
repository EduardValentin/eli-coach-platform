import { describe, expect, it } from "vitest";

import {
  HttpJsonError,
  handleHttpErrorResponse,
} from "./http.server";

describe("HTTP server error handling", () => {
  it("maps thrown JSON HTTP errors to responses", async () => {
    // arrange
    const requestHandler = () => {
      throw new HttpJsonError({
        body: {
          success: false,
          error: {
            code: "invalid_email",
            message: "Please enter a valid email address.",
          },
        },
        status: 400,
      });
    };

    // act
    const response = await handleHttpErrorResponse(requestHandler);

    // assert
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: "Please enter a valid email address.",
      },
    });
    expect(response.status).toBe(400);
  });

  it("lets unexpected errors bubble to the framework", async () => {
    // arrange
    const requestHandler = () => {
      throw new Error("database unavailable");
    };

    // act
    const response = handleHttpErrorResponse(requestHandler);

    // assert
    await expect(response).rejects.toThrow("database unavailable");
  });
});
