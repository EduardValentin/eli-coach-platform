import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  PROGRAM_BUILDER_ROUTE_SEGMENT,
  PROGRAM_SETUP_ROUTE_SEGMENT,
  programBuilderPath,
  programDraftSavePath,
  programSetupPath,
  TRAINING_PROGRAMS_API_PATHS,
} from "./paths";

const CLIENT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("training program paths", () => {
  it("links the coach to the program setup of a client, under her page", () => {
    // arrange
    const link = programSetupPath(CLIENT_ID);

    // act
    const match = matchPath(`/coach/${PROGRAM_SETUP_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe(`/coach/clients/${CLIENT_ID}/program/new`);
    expect(match?.params.clientId).toBe(CLIENT_ID);
  });

  it("links the coach to the builder of a client's draft, under her page", () => {
    // arrange
    const link = programBuilderPath(CLIENT_ID);

    // act
    const match = matchPath(`/coach/${PROGRAM_BUILDER_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe(`/coach/clients/${CLIENT_ID}/program/draft`);
    expect(match?.params.clientId).toBe(CLIENT_ID);
  });

  it("addresses the save of a client's draft", () => {
    // arrange
    const address = programDraftSavePath(CLIENT_ID);

    // act
    const match = matchPath(TRAINING_PROGRAMS_API_PATHS.programDraft, address);

    // assert
    expect(address).toBe(`/api/coach/clients/${CLIENT_ID}/program/draft`);
    expect(match?.params.clientId).toBe(CLIENT_ID);
  });
});
