import { describe, expect, it } from "vitest";

import {
  HttpJsonError,
  handleHttpErrorResponse,
  readTextRequestBody,
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

describe("readTextRequestBody", () => {
  it("reads a body within the limit as text", async () => {
    // arrange
    const request = new Request("https://evoa.fit/api/webhooks", {
      body: '{"id":"evt_1"}',
      method: "POST",
    });

    // act
    const body = await readTextRequestBody(request, { maxBytes: 64 });

    // assert
    expect(body).toEqual({ status: "valid", text: '{"id":"evt_1"}' });
  });

  it("refuses a body whose declared length is over the limit without reading it", async () => {
    // arrange
    const request = new Request("https://evoa.fit/api/webhooks", {
      body: "x".repeat(10),
      headers: { "Content-Length": "65" },
      method: "POST",
    });

    // act
    const body = await readTextRequestBody(request, { maxBytes: 64 });

    // assert
    expect(body).toEqual({ status: "too_large" });
    expect(request.bodyUsed).toBe(false);
  });

  it("refuses a streamed body that grows past the limit", async () => {
    // arrange
    const request = new Request("https://evoa.fit/api/webhooks", {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("x".repeat(40)));
          controller.enqueue(new TextEncoder().encode("x".repeat(40)));
          controller.close();
        },
      }),
      duplex: "half",
      method: "POST",
    } as RequestInit);

    // act
    const body = await readTextRequestBody(request, { maxBytes: 64 });

    // assert
    expect(body).toEqual({ status: "too_large" });
  });
});
