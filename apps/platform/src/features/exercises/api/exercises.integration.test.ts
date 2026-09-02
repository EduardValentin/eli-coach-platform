import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";

/**
 * Its own suite because the coach is named through the environment the
 * instance is spawned with; vitest's forks pool keeps the mutation to this
 * file.
 */
const suite = new ApiIntegrationTestSuite();
const coach = {
  sessionId: "sess_1exercisecoach",
  subjectId: "user_1exercisecoachsubject",
};
const member = {
  sessionId: "sess_2exercisemember",
  subjectId: "user_2exercisemembersubject",
};
type Session = typeof coach;

/** A minimal ISO BMFF: an `ftyp` box (isom, mp42) followed by an empty `mdat` box. */
const MP4_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
]);
/** Mirrors the controller's cap without importing the application. */
const OVERSIZED_PAYLOAD_BYTES = 50 * 1024 * 1024 + 256 * 1024 + 1;
const draft = {
  name: "Barbell Back Squat",
  description: "Brace and drive through the heels.",
  difficulty: "Intermediate",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  tags: ["Strength", "Hypertrophy"],
};

describe.sequential("Exercise library integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = coach.subjectId;
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  it("keeps the library and the hub to the coach", async () => {
    // arrange
    await provision(coach);
    await provision(member);

    // act
    const anonymousList = await suite.request(
      new Request(suite.url("/api/exercises")),
    );
    const memberList = await suite.request(sessionRequest("/api/exercises", member));
    const memberHub = await suite.request(
      sessionRequest("/coach/training/exercises", member),
    );
    const anonymousHub = await suite.request(
      new Request(suite.url("/coach/training/exercises"), { redirect: "manual" }),
    );

    // assert
    expect(anonymousList.status).toBe(401);
    expect(memberList.status).toBe(403);
    expect(memberHub.status).toBe(403);
    expect([302, 303, 307]).toContain(anonymousHub.status);
  });

  it("creates an exercise with a video, lists it, serves the video in ranges, then edits and detaches it", async () => {
    // arrange
    await provision(coach);

    // act
    const created = await suite.request(
      exerciseRequest("/api/exercises", "POST", { metadata: draft, video: MP4_BYTES }),
    );
    const createdBody = (await created.json()) as {
      success: true;
      exercise: { id: string; video: { url: string; sizeBytes: number } };
    };
    const listed = await suite.request(sessionRequest("/api/exercises", coach));
    const listedBody = (await listed.json()) as {
      exercises: { id: string; name: string }[];
    };
    const whole = await suite.request(
      absoluteRequest(createdBody.exercise.video.url, coach),
    );
    const partial = await suite.request(
      absoluteRequest(createdBody.exercise.video.url, coach, { range: "bytes=4-7" }),
    );
    const beyond = await suite.request(
      absoluteRequest(createdBody.exercise.video.url, coach, { range: "bytes=999-" }),
    );
    const storeKey = await suite.request(
      sessionRequest(
        `/api/exercises/videos/${encodeURIComponent("covers/abc.png")}`,
        coach,
      ),
    );
    const rows = await suite.postgres.queryRows<{
      video_asset_key: string;
      video_size_bytes: number;
    }>({
      sql: "select video_asset_key, video_size_bytes from app.exercises",
      values: [],
    });

    // assert
    expect(created.status).toBe(201);
    expect(createdBody.exercise.video.sizeBytes).toBe(MP4_BYTES.byteLength);
    expect(listedBody.exercises).toMatchObject([
      { id: createdBody.exercise.id, name: "Barbell Back Squat" },
    ]);
    expect(whole.status).toBe(200);
    expect(whole.headers.get("accept-ranges")).toBe("bytes");
    expect(Buffer.from(await whole.arrayBuffer())).toEqual(Buffer.from(MP4_BYTES));
    expect(partial.status).toBe(206);
    expect(partial.headers.get("content-range")).toBe(
      `bytes 4-7/${MP4_BYTES.byteLength}`,
    );
    expect(Buffer.from(await partial.arrayBuffer()).toString("latin1")).toBe("ftyp");
    expect(beyond.status).toBe(416);
    expect(storeKey.status).toBe(404);
    expect(rows).toEqual([
      {
        video_asset_key: expect.stringMatching(
          /^exercise-videos\/[0-9a-f]{64}\.mp4$/,
        ),
        video_size_bytes: MP4_BYTES.byteLength,
      },
    ]);
    await expect(
      readFile(join(suite.assetRoot(), rows[0]!.video_asset_key)),
    ).resolves.toEqual(Buffer.from(MP4_BYTES));

    // act — rename and detach the video
    const edited = await suite.request(
      exerciseRequest(`/api/exercises/${createdBody.exercise.id}`, "PATCH", {
        metadata: { ...draft, name: "Low Bar Back Squat", video: "remove" },
      }),
    );
    const detached = await suite.request(
      absoluteRequest(createdBody.exercise.video.url, coach),
    );

    // assert
    expect(edited.status).toBe(200);
    await expect(edited.json()).resolves.toMatchObject({
      exercise: { name: "Low Bar Back Squat", video: null },
    });
    expect(detached.status).toBe(404);
  });

  it("rejects a missing name, a non-MP4 file and an oversized payload, persisting nothing", async () => {
    // arrange
    await provision(coach);

    // act
    const unnamed = await suite.request(
      exerciseRequest("/api/exercises", "POST", { metadata: { ...draft, name: " " } }),
    );
    const notMp4 = await suite.request(
      exerciseRequest("/api/exercises", "POST", {
        metadata: draft,
        video: new Uint8Array(24),
        videoName: "clip.mov",
      }),
    );
    const oversized = await suite.request(
      new Request(suite.url("/api/exercises"), {
        body: new Uint8Array(OVERSIZED_PAYLOAD_BYTES),
        headers: {
          authorization: `Bearer ${mintSessionToken(coach)}`,
          "content-type": "multipart/form-data; boundary=oversized",
        },
        method: "POST",
      }),
    );
    const rows = await suite.postgres.queryRows<{ id: string }>({
      sql: "select id from app.exercises",
      values: [],
    });

    // assert
    expect(unnamed.status).toBe(400);
    await expect(unnamed.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "validation_failed",
        issues: [{ path: ["name"], message: "Exercise name is required" }],
      },
    });
    expect(notMp4.status).toBe(400);
    await expect(notMp4.json()).resolves.toMatchObject({
      error: {
        code: "validation_failed",
        issues: [{ code: "unsupported_video_content" }],
      },
    });
    expect(oversized.status).toBe(413);
    expect(rows).toHaveLength(0);
  });

  // Enabled once the Training hub pages land (Task 14 of the plan).
  it.skip("serves the hub, the library and the edit dialog as documents", async () => {
    // arrange
    await provision(coach);
    const created = await suite.request(
      exerciseRequest("/api/exercises", "POST", { metadata: draft }),
    );
    const { exercise } = (await created.json()) as { exercise: { id: string } };

    // act
    const plans = await suite.request(sessionRequest("/coach/training/plans", coach));
    const library = await suite.request(
      sessionRequest("/coach/training/exercises", coach),
    );
    const edit = await suite.request(
      sessionRequest(`/coach/training/exercises/${exercise.id}/edit`, coach),
    );
    const unknownEdit = await suite.request(
      sessionRequest(
        "/coach/training/exercises/7c1a0e2c-0e4b-4a4e-9d2b-1f2e3d4c5b6a/edit",
        coach,
      ),
    );
    const plansDocument = await plans.text();
    const libraryDocument = await library.text();
    const editDocument = await edit.text();

    // assert
    expect(plans.status).toBe(200);
    expect(plansDocument).toContain("Training &amp; Programs");
    expect(plansDocument).toContain("No client plans yet.");
    expect(library.status).toBe(200);
    expect(libraryDocument).toContain("Barbell Back Squat");
    expect(libraryDocument).toContain("New Exercise");
    expect(edit.status).toBe(200);
    expect(editDocument).toContain("Edit Exercise");
    expect(unknownEdit.status).toBe(404);
  });
});

async function provision(session: Session): Promise<void> {
  await suite.request(sessionRequest("/api/account", session));
}

function sessionRequest(path: string, session: Session): Request {
  return new Request(suite.url(path), {
    headers: { authorization: `Bearer ${mintSessionToken(session)}` },
  });
}

function absoluteRequest(
  url: string,
  session: Session,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${url}`, {
    headers: { authorization: `Bearer ${mintSessionToken(session)}`, ...headers },
  });
}

function exerciseRequest(
  path: string,
  method: "POST" | "PATCH",
  options: { metadata: unknown; video?: Uint8Array<ArrayBuffer>; videoName?: string },
): Request {
  const formData = new FormData();

  formData.set("metadata", JSON.stringify(options.metadata));

  if (options.video) {
    formData.set(
      "video",
      new File([options.video], options.videoName ?? "squat.mp4", {
        type: "video/mp4",
      }),
    );
  }

  return new Request(suite.url(path), {
    body: formData,
    headers: { authorization: `Bearer ${mintSessionToken(coach)}` },
    method,
  });
}
