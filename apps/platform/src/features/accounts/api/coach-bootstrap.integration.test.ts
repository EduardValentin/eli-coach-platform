import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { accountResponseSchema } from "~/features/accounts/contracts/account";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";

/**
 * Its own suite because a deployment names its bootstrap coach through the
 * environment, and the instance is handed that environment once, when
 * `suite.start()` spawns it.
 *
 * Mutating `process.env` here is contained to this file only because vitest
 * runs on its default `forks` pool with `isolate: true`, so each test file
 * gets its own process. Turning either off would leak this variable into
 * every other suite.
 */
const suite = new ApiIntegrationTestSuite();

const bootstrapCoach = {
  sessionId: "sess_4bootstrapcoachsession",
  subjectId: "user_4bootstrapcoachsubject",
};
const everyoneElse = {
  sessionId: "sess_5ordinarymembersession",
  subjectId: "user_5ordinarymembersubject",
};

describe.sequential("coach bootstrap integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = bootstrapCoach.subjectId;
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  it("provisions the named bootstrap subject as the COACH", async () => {
    // arrange, act
    const response = await requestAccount(bootstrapCoach);

    // assert
    const roles = await rolesOf(bootstrapCoach.subjectId);

    expect(response.status).toBe(200);
    expect(accountResponseSchema.parse(await response.json())).toEqual({
      role: "COACH",
    });
    expect(roles).toEqual(["COACH"]);
  });

  it("provisions every other subject as a USER", async () => {
    // arrange, act
    const response = await requestAccount(everyoneElse);

    // assert
    const roles = await rolesOf(everyoneElse.subjectId);

    expect(response.status).toBe(200);
    expect(accountResponseSchema.parse(await response.json())).toEqual({
      role: "USER",
    });
    expect(roles).toEqual(["USER"]);
  });
});

async function requestAccount(session: {
  sessionId: string;
  subjectId: string;
}): Promise<Response> {
  return suite.request(
    new Request(suite.url("/api/account"), {
      headers: { authorization: `Bearer ${mintSessionToken(session)}` },
    }),
  );
}

async function rolesOf(authSubjectId: string): Promise<string[]> {
  const rows = await suite.postgres.queryRows<{ role: string }>({
    sql: "select role from app.accounts where auth_subject_id = $1",
    values: [authSubjectId],
  });

  return rows.map((row) => row.role);
}
