import type { LoaderFunctionArgs } from "react-router";
import type { AccountSession } from "@eli-coach-platform/domain";
import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnedProducts: vi.fn(),
  getPlatformContainer: vi.fn(),
  getRuntimeEnvironment: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: mocks.getRuntimeEnvironment,
}));

import {
  accountContext,
} from "~/features/accounts/server/account-context.server";
import { createOwnedProduct } from "~/features/store/ui/public/library-products.test-support";

import { loader } from "./library.server";

const SIGN_IN_URL = "https://accounts.evoa.fit/sign-in";

describe("library loader", () => {
  it("sends a visitor who is not signed in to sign-in, and back to the Library after", async () => {
    // arrange
    stubLibraryDependencies(Response.json({ products: [], success: true }));
    const args = createLoaderArguments({ session: { kind: "anonymous" } });

    // act
    const loading = loader(args);

    // assert
    const redirected = await captureThrownResponse(loading);
    expect(redirected.status).toBe(302);
    expect(redirected.headers.get("Location")).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://evoa.fit/library")}`,
    );
    expect(mocks.getOwnedProducts).not.toHaveBeenCalled();
  });

  it("serves the owned products for server rendering", async () => {
    // arrange
    const product = createOwnedProduct();
    stubLibraryDependencies(Response.json({ products: [product], success: true }));

    // act
    const loaded = loader(createLoaderArguments());

    // assert
    await expect(loaded).resolves.toEqual({
      products: [product],
      status: "loaded",
    });
  });

  it("keeps a temporarily unavailable Library on the page instead of throwing it", async () => {
    // arrange
    stubLibraryDependencies(
      Response.json(
        {
          error: {
            code: "server_error",
            message: "Your Library is temporarily unavailable.",
          },
          success: false,
        },
        { status: 503 },
      ),
    );

    // act
    const loaded = loader(createLoaderArguments());

    // assert
    await expect(loaded).resolves.toEqual({ status: "unavailable" });
  });

  it("passes the whole request to the controller, which claims prior guest acquisitions", async () => {
    // arrange
    stubLibraryDependencies(Response.json({ products: [], success: true }));
    const args = createLoaderArguments();

    // act
    await loader(args);

    // assert
    expect(mocks.getOwnedProducts).toHaveBeenCalledWith(args);
  });

  it("refuses to render a response it did not expect", async () => {
    // arrange
    stubLibraryDependencies(
      Response.json({ error: "unauthenticated" }, { status: 401 }),
    );

    // act
    const loading = loader(createLoaderArguments());

    // assert
    const thrown = await captureThrownResponse(loading);
    expect(thrown.status).toBe(401);
  });
});

async function captureThrownResponse(loading: Promise<unknown>) {
  const thrown = await loading.then(
    () => null,
    (error: unknown) => error,
  );

  if (!(thrown instanceof Response)) {
    throw new Error("Expected the loader to throw a response.");
  }

  return thrown;
}

function stubLibraryDependencies(response: Response) {
  mocks.getRuntimeEnvironment.mockReturnValue({
    CLERK_SIGN_IN_URL: SIGN_IN_URL,
    PUBLIC_APP_URL: "https://evoa.fit",
  });
  mocks.getOwnedProducts.mockResolvedValue(response);
  mocks.getPlatformContainer.mockReturnValue({
    storeLibraryController: { getOwnedProducts: mocks.getOwnedProducts },
  });
}

function createLoaderArguments(options?: {
  session?: AccountSession;
}): LoaderFunctionArgs {
  const session: AccountSession = options?.session ?? {
    account: {
      authSubjectId: "user_1",
      deletedAt: null,
      id: "acct_1",
      role: "USER",
    },
    kind: "authenticated",
  };

  return {
    context: new RouterContextProvider(new Map([[accountContext, session]])),
    params: {},
    request: new Request("https://eli.example/library"),
  } as unknown as LoaderFunctionArgs;
}

