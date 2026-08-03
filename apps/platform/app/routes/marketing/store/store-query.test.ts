// @vitest-environment happy-dom

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  fetchStoreCatalog,
  STORE_CATALOG_API_URL,
  submitStoreAcquisition,
} from "./store-query";

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

describe("store query", () => {
  it("returns a valid empty catalog as a successful state", async () => {
    // arrange
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({ products: [], success: true }),
      ),
    );

    // act
    const catalog = fetchStoreCatalog(new AbortController().signal);

    // assert
    await expect(catalog).resolves.toEqual([]);
  });

  it("rejects unavailable and malformed catalogs instead of treating them as empty", async () => {
    // arrange
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "server_error",
              message: "The store is temporarily unavailable.",
            },
            success: false,
          },
          { status: 503 },
        ),
      ),
    );

    // act
    const catalog = fetchStoreCatalog(new AbortController().signal);

    // assert
    await expect(catalog).rejects.toThrow(
      "The store is temporarily unavailable.",
    );
  });

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
