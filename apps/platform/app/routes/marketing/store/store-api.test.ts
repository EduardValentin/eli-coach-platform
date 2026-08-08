// @vitest-environment happy-dom

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { submitStoreAcquisition } from "./store-api";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("store acquisition API", () => {
  it("posts acquisition form data through the public request boundary", async () => {
    // arrange
    let submittedEmail: FormDataEntryValue | null = null;
    server.use(
      http.post("/api/store/acquisitions", async ({ request }) => {
        submittedEmail = (await request.formData()).get("email");

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    const formData = new FormData();
    formData.set("email", "woman@example.com");

    // act
    const response = submitStoreAcquisition(formData);

    // assert
    await expect(response).resolves.toEqual({ success: true });
    expect(submittedEmail).toBe("woman@example.com");
  });
});
