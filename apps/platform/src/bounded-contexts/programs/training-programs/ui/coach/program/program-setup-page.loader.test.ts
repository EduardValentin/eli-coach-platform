import { redirect } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";
import {
  trainingProgramsContext,
  type TrainingProgramsFeature,
} from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";
import type {
  ProgramCreateOutcome,
  ProgramSetupView,
} from "~/bounded-contexts/programs/training-programs/public/program-setup";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { action, loader, meta } from "./program-setup-page";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const ENDED_CLIENT_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";

const NOT_READY: ProgramSetupView = {
  state: "not-ready",
  client: {
    clientId: CLIENT_ID,
    firstName: "Ana",
    lastName: "Popescu",
    gender: "female",
  },
};

const FAILED: ProgramCreateOutcome = { status: "failed" };

function setupArgs(clientId: string) {
  const loadSetup = vi.fn(async (_args: unknown, target?: string) => {
    if (target === ENDED_CLIENT_ID) {
      throw redirect(coachClientPath(ENDED_CLIENT_ID));
    }

    return NOT_READY;
  });
  const create = vi.fn().mockResolvedValue(FAILED);
  const feature = {
    coachProgramController: { loadSetup, create },
  } as unknown as TrainingProgramsFeature;
  const args = createRequestArgs({
    contexts: [contextEntry(trainingProgramsContext, feature)],
    params: { clientId },
  });

  return { args, create, loadSetup };
}

describe("program setup page", () => {
  it("reads the setup of the client the address names", async () => {
    // arrange
    const { args, loadSetup } = setupArgs(CLIENT_ID);

    // act
    const setup = await loader(args);

    // assert
    expect(setup).toBe(NOT_READY);
    expect(loadSetup).toHaveBeenCalledWith(args, CLIENT_ID);
  });

  it("leads back to her page when the setup is not hers to open", async () => {
    // arrange
    const { args } = setupArgs(ENDED_CLIENT_ID);

    // act
    const answer = await loader(args).catch((thrown: unknown) => thrown);

    // assert
    expect(answer).toBeInstanceOf(Response);
    expect((answer as Response).headers.get("Location")).toBe(
      coachClientPath(ENDED_CLIENT_ID),
    );
  });

  it("creates the program of the client the address names and answers what came of it", async () => {
    // arrange
    const { args, create } = setupArgs(CLIENT_ID);

    // act
    const outcome = await action(args);

    // assert
    expect(outcome).toBe(FAILED);
    expect(create).toHaveBeenCalledWith(args, CLIENT_ID);
  });
});

describe("program setup page meta", () => {
  it("titles the page after the client whose program it builds", () => {
    // arrange
    const ready = {
      ...NOT_READY,
      state: "ready",
    } as unknown as ProgramSetupView;

    // act
    const descriptors = meta({ loaderData: ready } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Build Ana’s program | Evoa" }]);
  });

  it("titles the not-ready setup after what it says", () => {
    // arrange, act
    const descriptors = meta({ loaderData: NOT_READY } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Program not ready yet | Evoa" }]);
  });
});
