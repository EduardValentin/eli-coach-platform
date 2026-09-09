import type { LoaderFunctionArgs } from "react-router";
import type { AccountSession } from "@eli-coach-platform/domain";
import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnedProducts: vi.fn(),
  getPlatformContainer: vi.fn(),
  getRuntimeEnvironment: vi.fn(),
  linkPriorAcquisitions: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: mocks.getRuntimeEnvironment,
}));

import { accountContext } from "~/features/accounts/server/account-context.server";
import { createOwnedProduct } from "~/features/store/ui/public/library-products.test-support";

import { loader } from "./library.server";

const SIGN_IN_URL = "https://accounts.evoa.fit/sign-in";

const SIGNED_IN_ACCOUNT_ID = "acct_1";

describe("library loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a visitor who is not signed in to sign-in, and back to the Library after", async () => {
    // arrange
    wireLibraryContainer();
    answerWithLibrary(Response.json({ products: [], success: true }));
    const args = createLoaderArguments({ session: { kind: "anonymous" } });

    // act
    const loading = loader(args);

    // assert
    const redirected = await captureThrownResponse(loading);
    expect(redirected.status).toBe(302);
    expect(redirected.headers.get("Location")).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://evoa.fit/library")}`,
    );
    expect(mocks.linkPriorAcquisitions).not.toHaveBeenCalled();
    expect(mocks.getOwnedProducts).not.toHaveBeenCalled();
  });

  it("serves the owned products for server rendering", async () => {
    // arrange
    const product = createOwnedProduct();
    wireLibraryContainer();
    answerWithLibrary(Response.json({ products: [product], success: true }));

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
    wireLibraryContainer();
    answerWithLibrary(
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

  it("claims prior guest acquisitions before it reads the account's Library", async () => {
    // arrange
    const order: string[] = [];
    wireLibraryContainer();
    mocks.linkPriorAcquisitions.mockImplementation(async () => {
      order.push("claim");
    });
    mocks.getOwnedProducts.mockImplementation(async () => {
      order.push("list");

      return Response.json({ products: [], success: true });
    });
    const args = createLoaderArguments();

    // act
    await loader(args);

    // assert
    expect(order).toEqual(["claim", "list"]);
    expect(mocks.linkPriorAcquisitions).toHaveBeenCalledWith(args);
  });

  it("names the signed-in account whose Library it reads", async () => {
    // arrange
    wireLibraryContainer();
    answerWithLibrary(Response.json({ products: [], success: true }));

    // act
    await loader(createLoaderArguments());

    // assert
    expect(mocks.getOwnedProducts).toHaveBeenCalledWith(SIGNED_IN_ACCOUNT_ID);
  });

  it("refuses to render a response it did not expect", async () => {
    // arrange
    wireLibraryContainer();
    answerWithLibrary(
      Response.json({ error: "server_error" }, { status: 500 }),
    );

    // act
    const loading = loader(createLoaderArguments());

    // assert
    const thrown = await captureThrownResponse(loading);
    expect(thrown.status).toBe(500);
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

function wireLibraryContainer() {
  mocks.getRuntimeEnvironment.mockReturnValue({
    CLERK_SIGN_IN_URL: SIGN_IN_URL,
    PUBLIC_APP_URL: "https://evoa.fit",
  });
  mocks.linkPriorAcquisitions.mockResolvedValue(undefined);
  mocks.getPlatformContainer.mockReturnValue({
    storeLibraryController: { getOwnedProducts: mocks.getOwnedProducts },
    storeOwnershipController: {
      linkPriorAcquisitions: mocks.linkPriorAcquisitions,
    },
  });
}

function answerWithLibrary(response: Response) {
  mocks.getOwnedProducts.mockResolvedValue(response);
}

function createLoaderArguments(options?: {
  session?: AccountSession;
}): LoaderFunctionArgs {
  const session: AccountSession = options?.session ?? {
    account: {
      authSubjectId: "user_1",
      deletedAt: null,
      id: SIGNED_IN_ACCOUNT_ID,
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
