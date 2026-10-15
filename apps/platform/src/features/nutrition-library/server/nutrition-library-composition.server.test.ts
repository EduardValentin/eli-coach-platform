import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { composeNutritionLibraryFeature } from "./nutrition-library-composition.server";

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const OATS_REQUEST = {
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
};

describe("composeNutritionLibraryFeature", () => {
  it("lists the library from the foods table", async () => {
    // arrange
    const feature = composeNutritionLibraryFeature(createHandles());

    // act
    const listing = feature.foodLibrary.list(coachArgs());

    // assert
    await expect(listing).rejects.toThrow("database down");
  });

  it("reports a creation that could not reach the foods table to the incidents it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.foodLibrary.create(
      coachArgs(jsonRequest("POST")),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.incidents.foodCreationFailed).toHaveBeenCalledWith({
      error: new Error("database down"),
    });
  });

  it("reports an edit that could not reach the foods table to the incidents it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.foodLibrary.edit(
      coachArgs(jsonRequest("PUT")),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.incidents.foodEditFailed).toHaveBeenCalledWith({
      foodId: FOOD_ID,
      error: new Error("database down"),
    });
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-14T09:00:00.000Z") },
    database: createUnreachableDatabase(),
    incidents: {
      foodCreationFailed: vi.fn(),
      foodEditFailed: vi.fn(),
    },
  };
}

function createUnreachableDatabase(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function jsonRequest(method: "POST" | "PUT"): Request {
  return new Request("https://evoa.fit/api/coach/foods", {
    body: JSON.stringify(OATS_REQUEST),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

function coachArgs(request = new Request("https://evoa.fit/coach/nutrition")) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, { account: COACH, kind: "authenticated" }),
    ],
    request,
  });
}
