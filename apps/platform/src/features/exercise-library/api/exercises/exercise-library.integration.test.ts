import { readFile } from "node:fs/promises";

import {
  LANDSCAPE_SAMPLE_VIDEO_PATH,
  PORTRAIT_SAMPLE_VIDEO_PATH,
} from "@eli-coach-platform/test-support/sample-videos";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import {
  ExerciseLibraryJourney,
  LIBRARY_PAGE,
  VISITOR,
  type ExerciseFields,
  type UploadedVideo,
} from "~integration-test-config/exercise-library-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  OTHER_COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const library = new ExerciseLibraryJourney(rig);

const CREATED_AT = new Date("2026-10-14T09:00:00.000Z");
const EDITED_AT = new Date("2026-10-15T10:30:00.000Z");
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_UUID = "not-an-exercise";
const LIBRARY = { redirectTo: "/coach/training" };

const BACK_SQUAT: ExerciseFields = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace, then sit between the hips.",
};

const HIP_THRUST: ExerciseFields = {
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "",
};

const BOX_BREATHING: ExerciseFields = {
  name: "Box breathing",
  type: "breathing",
  unit: "breaths",
  perSide: false,
  primaryMuscles: ["Core"],
  secondaryMuscles: [],
  equipment: ["Mat"],
  difficulty: "Beginner",
  tags: ["Recovery"],
  cues: "Four counts each side of the box.",
};

const PLANK: ExerciseFields = {
  name: "plank",
  type: "resistance",
  unit: "time",
  perSide: false,
  primaryMuscles: ["Core"],
  secondaryMuscles: [],
  equipment: [],
  difficulty: "Beginner",
  tags: [],
  cues: "",
};

const FIVE_PROBLEMS = [
  {
    problem: "no name",
    fields: { name: "   " },
    problems: { name: "missing" },
  },
  {
    problem: "a name of 81 characters",
    fields: { name: "n".repeat(81) },
    problems: { name: "too-long" },
  },
  {
    problem: "form cues of 1,001 characters",
    fields: { cues: "c".repeat(1_001) },
    problems: { cues: "too-long" },
  },
  {
    problem: "no primary muscle for a resistance exercise",
    fields: { primaryMuscles: [] },
    problems: { primaryMuscles: "missing" },
  },
  {
    problem: "a name another exercise has",
    fields: { name: "  hip THRUST " },
    problems: { name: "taken" },
  },
];

const MALFORMED_BODIES: [string, unknown][] = [
  ["a body that is not JSON", "{"],
  ["a body missing a field", { ...BACK_SQUAT, cues: undefined }],
  ["a field of the wrong shape", { ...BACK_SQUAT, perSide: "no" }],
];

const FIFTY_MEGABYTES = 50 * 1024 * 1024;

async function sampleVideo(
  path: string,
  file: Omit<UploadedVideo, "bytes">,
): Promise<UploadedVideo> {
  return { ...file, bytes: new Uint8Array(await readFile(path)) };
}

function paddedTo(video: UploadedVideo, sizeBytes: number): UploadedVideo {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set(video.bytes);

  return { ...video, bytes };
}

describe.sequential("exercise library integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("creating an exercise", () => {
    it("stores every entry, the name trimmed, as the signed-in coach's, and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);

      // act
      const response = await library.create(COACH_SESSION, {
        ...BACK_SQUAT,
        name: "  Back squat  ",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      const { cues, ...columns } = BACK_SQUAT;
      expect(await library.exerciseRows()).toEqual([
        {
          ...columns,
          id: expect.any(String),
          ownerSubjectId: COACH_SESSION.subjectId,
          formCues: cues,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ]);
    });

    it("stores a cardio exercise without a primary muscle and a bodyweight exercise without equipment", async () => {
      // arrange
      const jog = {
        ...BACK_SQUAT,
        name: "Easy jog",
        type: "cardio",
        unit: "time",
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        tags: [],
        cues: "",
      };

      // act
      const response = await library.create(COACH_SESSION, jog);

      // assert
      expect(response.status).toBe(200);
      expect(await library.exerciseRows()).toEqual([
        expect.objectContaining({
          name: "Easy jog",
          primaryMuscles: [],
          equipment: [],
        }),
      ]);
    });

    it.each(FIVE_PROBLEMS)(
      "refuses $problem with 422 and its code, storing nothing new",
      async ({ fields, problems }) => {
        // arrange
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.create(COACH_SESSION, {
          ...BACK_SQUAT,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.exerciseRows()).map(({ name }) => name)).toEqual([
          "Hip thrust",
        ]);
      },
    );

    it.each([
      ["the same name", "Hip thrust"],
      ["a differently cased name", "HIP THRUST"],
      ["a name with surrounding spaces", "  Hip thrust  "],
    ])("refuses a duplicate given as %s", async (_case, name) => {
      // arrange
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.create(COACH_SESSION, {
        ...HIP_THRUST,
        name,
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.exerciseRows()).toHaveLength(1);
    });

    it("keeps one of two exercises created at once under the same name and refuses the other as taken", async () => {
      // arrange
      const twins = [{ ...HIP_THRUST }, { ...HIP_THRUST, name: " hip thrust" }];

      // act
      const responses = await Promise.all(
        twins.map((fields) => library.create(COACH_SESSION, fields)),
      );

      // assert
      const statuses = responses.map(({ status }) => status).sort();
      expect(statuses).toEqual([200, 422]);
      const refused = responses.find(({ status }) => status === 422);
      expect(await refused?.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.exerciseRows()).toHaveLength(1);
    });

    it("refuses values outside the library's vocabulary with 422 and their codes", async () => {
      // arrange
      const fields = {
        ...BACK_SQUAT,
        type: "yoga",
        equipment: ["Sled"],
        tags: ["Power"],
      };

      // act
      const response = await library.create(COACH_SESSION, fields);

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { type: "unknown", equipment: "unknown", tags: "unknown" },
      });
      expect(await library.exerciseRows()).toEqual([]);
    });

    it("refuses a unit the type does not measure in", async () => {
      // arrange
      const fields = { ...BOX_BREATHING, unit: "reps" };

      // act
      const response = await library.create(COACH_SESSION, fields);

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { unit: "not-allowed" },
      });
    });

    it.each(MALFORMED_BODIES)("answers 400 to %s", async (_case, body) => {
      // arrange
      const malformed = body;

      // act
      const response = await library.create(COACH_SESSION, malformed);

      // assert
      expect(response.status).toBe(400);
      expect(await library.exerciseRows()).toEqual([]);
    });
  });

  describe("editing an exercise", () => {
    it("replaces every entry, keeps its owner and the moment it was created and names the library as the next page", async () => {
      // arrange
      await rig.holdClock(CREATED_AT);
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      await rig.holdClock(EDITED_AT);
      const revised = {
        ...BACK_SQUAT,
        name: " Front squat ",
        type: "mobility",
        unit: "time",
        perSide: true,
        primaryMuscles: ["Quadriceps", "Core"],
        secondaryMuscles: ["Glutes"],
        equipment: [],
        difficulty: "Advanced",
        tags: ["Strength", "Recovery"],
        cues: "Elbows high.",
      };

      // act
      const response = await library.edit(COACH_SESSION, squat.id, revised);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      const { cues, ...columns } = revised;
      expect(await library.exerciseRows()).toEqual([
        {
          ...columns,
          id: squat.id,
          ownerSubjectId: COACH_SESSION.subjectId,
          name: "Front squat",
          formCues: cues,
          createdAt: CREATED_AT,
          updatedAt: EDITED_AT,
        },
      ]);
    });

    it.each([
      ["unchanged", "Back squat"],
      ["recased and spaced", "  back SQUAT "],
    ])("keeps its own name %s", async (_case, name) => {
      // arrange
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.edit(COACH_SESSION, squat.id, {
        ...BACK_SQUAT,
        name,
        tags: [],
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.exerciseRows()).toEqual([
        expect.objectContaining({ id: squat.id, name: name.trim(), tags: [] }),
        expect.objectContaining({ name: "Hip thrust" }),
      ]);
    });

    it.each([
      ["the same name", "Hip thrust"],
      ["a differently cased and spaced name", " HIP thrust  "],
    ])(
      "refuses a rename onto another exercise's name given as %s",
      async (_case, name) => {
        // arrange
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.edit(COACH_SESSION, squat.id, {
          ...BACK_SQUAT,
          name,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems: { name: "taken" } });
        expect(
          (await library.exerciseRows()).map(({ name: stored }) => stored),
        ).toEqual(["Back squat", "Hip thrust"]);
      },
    );

    it.each(FIVE_PROBLEMS)(
      "refuses $problem with 422 and its code, leaving the exercise as it was",
      async ({ fields, problems }) => {
        // arrange
        await rig.holdClock(CREATED_AT);
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
        await library.createAccepted(COACH_SESSION, HIP_THRUST);

        // act
        const response = await library.edit(COACH_SESSION, squat.id, {
          ...BACK_SQUAT,
          ...fields,
        });

        // assert
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ problems });
        expect((await library.exerciseRows())[0]).toEqual(squat);
      },
    );

    it.each(MALFORMED_BODIES)(
      "answers 400 to %s, leaving the exercise as it was",
      async (_case, body) => {
        // arrange
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

        // act
        const response = await library.edit(COACH_SESSION, squat.id, body);

        // assert
        expect(response.status).toBe(400);
        expect(await library.exerciseRows()).toEqual([squat]);
      },
    );

    it.each([
      ["an unknown exercise", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("answers 404 for %s", async (_case, exerciseId) => {
      // arrange
      await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const response = await library.edit(
        COACH_SESSION,
        exerciseId,
        HIP_THRUST,
      );

      // assert
      expect(response.status).toBe(404);
      expect((await library.exerciseRows()).map(({ name }) => name)).toEqual([
        "Back squat",
      ]);
    });
  });

  describe("an exercise's demo video", () => {
    let landscape: UploadedVideo;
    let portrait: UploadedVideo;

    beforeAll(async () => {
      landscape = await sampleVideo(LANDSCAPE_SAMPLE_VIDEO_PATH, {
        name: "squat.mp4",
        type: "video/mp4",
      });
      portrait = await sampleVideo(PORTRAIT_SAMPLE_VIDEO_PATH, {
        name: "squat.mov",
        type: "video/quicktime",
      });
    });

    beforeEach(async () => {
      await library.clearVideoFiles();
    });

    async function squatWithVideo(video: UploadedVideo) {
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, video: "attach" },
        video,
      );

      if (response.status !== 200) {
        throw new Error(`Uploading answered ${response.status}.`);
      }

      const [squat] = await library.exerciseRows();

      if (!squat) {
        throw new Error("The exercise was not stored.");
      }

      return { squat, video: await library.videoColumnsOf(squat.id) };
    }

    it("stores the uploaded video with the exercise as a private file of its exact bytes", async () => {
      // arrange
      const video = landscape;

      // act
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, video: "attach" },
        video,
      );

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(LIBRARY);
      const [squat] = await library.exerciseRows();
      const columns = await library.videoColumnsOf(squat?.id ?? "");
      expect(columns).toEqual({
        videoId: expect.any(String),
        videoFormat: "mp4",
        videoSizeBytes: video.bytes.byteLength,
      });
      expect(await library.videoFiles()).toEqual({
        kept: [columns.videoId],
        incoming: [],
      });
      expect(
        new Uint8Array(
          await readFile(library.keptVideoPath(columns.videoId ?? "")),
        ),
      ).toEqual(video.bytes);
    });

    it("replaces the video with a QuickTime one and deletes the replaced file", async () => {
      // arrange
      const { squat, video: first } = await squatWithVideo(landscape);

      // act
      const response = await library.editWithVideo(COACH_SESSION, squat.id, {
        fields: { ...BACK_SQUAT, video: "attach" },
        video: portrait,
      });

      // assert
      expect(response.status).toBe(200);
      const second = await library.videoColumnsOf(squat.id);
      expect(second).toEqual({
        videoId: expect.any(String),
        videoFormat: "mov",
        videoSizeBytes: portrait.bytes.byteLength,
      });
      expect(second.videoId).not.toBe(first.videoId);
      expect(await library.videoFiles()).toEqual({
        kept: [second.videoId],
        incoming: [],
      });
    });

    it("keeps the video through a plain save of the exercise", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(landscape);

      // act
      const response = await library.edit(COACH_SESSION, squat.id, {
        ...BACK_SQUAT,
        cues: "Brace.",
        video: "keep",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.videoColumnsOf(squat.id)).toEqual(video);
      expect((await library.videoFiles()).kept).toEqual([video.videoId]);
    });

    it("removes the video and deletes its file", async () => {
      // arrange
      const { squat } = await squatWithVideo(landscape);

      // act
      const response = await library.edit(COACH_SESSION, squat.id, {
        ...BACK_SQUAT,
        video: "remove",
      });

      // assert
      expect(response.status).toBe(200);
      expect(await library.videoColumnsOf(squat.id)).toEqual({
        videoId: null,
        videoFormat: null,
        videoSizeBytes: null,
      });
      expect(await library.videoFiles()).toEqual({ kept: [], incoming: [] });
    });

    it("refuses a file renamed to .mp4 that holds no video, naming the video field, and stores nothing", async () => {
      // arrange
      const renamed = {
        name: "notes.mp4",
        type: "video/mp4",
        bytes: new TextEncoder().encode(
          "Squat notes, not a video.\n".repeat(200),
        ),
      };

      // act
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, video: "attach" },
        renamed,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { video: "unsupported" },
      });
      expect(await library.exerciseRows()).toEqual([]);
      expect(await library.videoFiles()).toEqual({ kept: [], incoming: [] });
    });

    it("refuses a video one byte over 50 MB as too large, naming the video field, and stores nothing", async () => {
      // arrange
      const oversized = paddedTo(landscape, FIFTY_MEGABYTES + 1);

      // act
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, video: "attach" },
        oversized,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        problems: { video: "too-large" },
      });
      expect(await library.exerciseRows()).toEqual([]);
      expect(await library.videoFiles()).toEqual({ kept: [], incoming: [] });
    });

    it("answers 413 to an upload beyond 50 MB and its form allowance, and stores nothing", async () => {
      // arrange
      const beyondTheRequestCap = paddedTo(
        landscape,
        FIFTY_MEGABYTES + 2 * 1024 * 1024,
      );

      // act
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, video: "attach" },
        beyondTheRequestCap,
      );

      // assert
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({
        problems: { video: "too-large" },
      });
      expect(await library.exerciseRows()).toEqual([]);
      expect(await library.videoFiles()).toEqual({ kept: [], incoming: [] });
    });

    it("leaves no file behind when the save refuses the name as taken", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.createWithVideo(
        COACH_SESSION,
        { ...BACK_SQUAT, name: " hip THRUST", video: "attach" },
        landscape,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ problems: { name: "taken" } });
      expect(await library.videoFiles()).toEqual({ kept: [], incoming: [] });
    });

    it("plays the whole video to the coach, privately cacheable under its stored id", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(landscape);

      // act
      const response = await library.playVideo(COACH_SESSION, squat.id, {
        videoId: video.videoId ?? "",
      });

      // assert
      expect(response.status).toBe(200);
      expect(Object.fromEntries(response.headers)).toMatchObject({
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=31536000, immutable",
        "content-length": String(landscape.bytes.byteLength),
        "content-type": "video/mp4",
        "cross-origin-resource-policy": "same-origin",
        "x-content-type-options": "nosniff",
      });
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(
        landscape.bytes,
      );
    });

    it("answers a range request with 206 and exactly the bytes asked for", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(landscape);
      const size = landscape.bytes.byteLength;

      // act
      const response = await library.playVideo(COACH_SESSION, squat.id, {
        videoId: video.videoId ?? "",
        range: "bytes=100-199",
      });

      // assert
      expect(response.status).toBe(206);
      expect(response.headers.get("Content-Range")).toBe(
        `bytes 100-199/${size}`,
      );
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(
        landscape.bytes.slice(100, 200),
      );
    });

    it("answers a suffix range with the video's last bytes", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(portrait);
      const size = portrait.bytes.byteLength;

      // act
      const response = await library.playVideo(COACH_SESSION, squat.id, {
        videoId: video.videoId ?? "",
        range: "bytes=-64",
      });

      // assert
      expect(response.status).toBe(206);
      expect(response.headers.get("Content-Range")).toBe(
        `bytes ${size - 64}-${size - 1}/${size}`,
      );
      expect(response.headers.get("Content-Type")).toBe("video/quicktime");
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(
        portrait.bytes.slice(size - 64),
      );
    });

    it("answers 416 with the video's size to a range starting past its end", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(landscape);
      const size = landscape.bytes.byteLength;

      // act
      const response = await library.playVideo(COACH_SESSION, squat.id, {
        videoId: video.videoId ?? "",
        range: `bytes=${size}-`,
      });

      // assert
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe(`bytes */${size}`);
    });

    it("answers 404 for a replaced video's address", async () => {
      // arrange
      const { squat, video: replaced } = await squatWithVideo(landscape);
      await library.editWithVideo(COACH_SESSION, squat.id, {
        fields: { ...BACK_SQUAT, video: "attach" },
        video: portrait,
      });

      // act
      const response = await library.playVideo(COACH_SESSION, squat.id, {
        videoId: replaced.videoId ?? "",
      });

      // assert
      expect(response.status).toBe(404);
    });

    it.each([
      { who: "another coach", requester: OTHER_COACH_SESSION },
      { who: "a signed-in client", requester: CLIENT_SESSION },
      { who: "a signed-out visitor", requester: VISITOR },
    ] as const)(
      "refuses $who the video as not found",
      async ({ requester }) => {
        // arrange
        await rig.provisionOtherCoach();
        await rig.provisionClient();
        const { squat, video } = await squatWithVideo(landscape);

        // act
        const response = await library.playVideo(requester, squat.id, {
          videoId: video.videoId ?? "",
        });

        // assert
        expect(response.status).toBe(404);
      },
    );

    it("shows the exercise as having a video attached in the library", async () => {
      // arrange
      await squatWithVideo(landscape);
      await library.createAccepted(COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain("Difficulty Video Actions");
      expect(page).toContain(
        [
          "Back squat Resistance · Barbell, Squat rack Strength Quadriceps Glutes Intermediate Attached",
          "Hip thrust Resistance · Barbell, Bench Hypertrophy Glutes Beginner —",
        ].join(" "),
      );
    });

    it("refuses a write to the video address", async () => {
      // arrange
      const { squat, video } = await squatWithVideo(landscape);

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        `/api/exercises/${squat.id}/video/${video.videoId}`,
        { method: "DELETE" },
      );

      // assert
      expect(response.status).toBe(405);
      expect((await library.videoFiles()).kept).toEqual([video.videoId]);
    });
  });

  describe("whose library it is", () => {
    beforeEach(async () => {
      await rig.provisionOtherCoach();
    });

    it("stores a name another coach's exercise already has as her own", async () => {
      // arrange
      await library.createAccepted(OTHER_COACH_SESSION, HIP_THRUST);

      // act
      const response = await library.create(COACH_SESSION, {
        ...HIP_THRUST,
        name: " hip THRUST",
      });

      // assert
      expect(response.status).toBe(200);
      expect(
        (await library.exerciseRows()).map(({ name, ownerSubjectId }) => [
          name,
          ownerSubjectId,
        ]),
      ).toEqual([
        ["hip THRUST", COACH_SESSION.subjectId],
        ["Hip thrust", OTHER_COACH_SESSION.subjectId],
      ]);
    });

    it("renames her exercise onto a name only another coach's exercise has", async () => {
      // arrange
      await library.createAccepted(OTHER_COACH_SESSION, HIP_THRUST);
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const response = await library.edit(COACH_SESSION, squat.id, {
        ...BACK_SQUAT,
        name: "Hip thrust",
      });

      // assert
      expect(response.status).toBe(200);
      expect(
        (await library.exerciseRows()).map(({ id, ownerSubjectId }) => [
          id,
          ownerSubjectId,
        ]),
      ).toEqual([
        [squat.id, COACH_SESSION.subjectId],
        [expect.any(String), OTHER_COACH_SESSION.subjectId],
      ]);
    });

    it("answers 404 to editing another coach's exercise, leaving it as it was", async () => {
      // arrange
      const othersSquat = await library.createAccepted(
        OTHER_COACH_SESSION,
        BACK_SQUAT,
      );

      // act
      const response = await library.edit(
        COACH_SESSION,
        othersSquat.id,
        HIP_THRUST,
      );

      // assert
      expect(response.status).toBe(404);
      expect(await library.exerciseRows()).toEqual([othersSquat]);
    });

    it("lists only her own exercises", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, HIP_THRUST);
      await library.createAccepted(OTHER_COACH_SESSION, BOX_BREATHING);

      // act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain("Hip thrust");
      expect(page).not.toContain("Box breathing");
    });

    it("returns her to the library when she opens another coach's exercise", async () => {
      // arrange
      const othersSquat = await library.createAccepted(
        OTHER_COACH_SESSION,
        BACK_SQUAT,
      );

      // act
      const response = await library.openExercise(
        COACH_SESSION,
        othersSquat.id,
      );

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(LIBRARY_PAGE));
    });
  });

  describe("who may write", () => {
    it.each([
      { who: "a signed-in client", requester: CLIENT_SESSION, status: 403 },
      { who: "a signed-out visitor", requester: VISITOR, status: 401 },
    ] as const)(
      "refuses $who on every exercise endpoint",
      async ({ requester, status }) => {
        // arrange
        await rig.provisionClient();
        const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

        // act
        const answers = await Promise.all([
          library.create(requester, HIP_THRUST),
          library.edit(requester, squat.id, HIP_THRUST),
        ]);

        // assert
        expect(answers.map((answer) => answer.status)).toEqual([
          status,
          status,
        ]);
        expect(await library.exerciseRows()).toEqual([squat]);
      },
    );
  });

  describe("the coach's pages", () => {
    it("lists every exercise A to Z with its type, equipment, tags, primary muscles, difficulty and whether it has a video", async () => {
      // arrange
      await library.createAccepted(COACH_SESSION, HIP_THRUST);
      await library.createAccepted(COACH_SESSION, PLANK);
      await library.createAccepted(COACH_SESSION, BOX_BREATHING);
      await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain(
        "Exercises Build the exercise library your plans draw from. New exercise",
      );
      expect(page).toContain(
        [
          "Back squat Resistance · Barbell, Squat rack Strength Quadriceps Glutes Intermediate —",
          "Box breathing Breathing · Mat Recovery Core Beginner —",
          "Hip thrust Resistance · Barbell, Bench Hypertrophy Glutes Beginner —",
          "plank Resistance · No equipment Core Beginner —",
        ].join(" "),
      );
    });

    it("tells her the library is empty before she adds an exercise", async () => {
      // arrange, act
      const response = await library.openLibrary(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await pageTextOf(response)).toContain(
        "No exercises yet Exercises you add appear here.",
      );
    });

    it("opens a blank exercise on the new exercise page", async () => {
      // arrange, act
      const response = await library.openNewExercise(COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const page = await pageTextOf(response);
      expect(page).toContain(
        "Back to exercises New exercise About the exercise",
      );
      expect(page).toContain("Resistance");
      expect(page).toContain("Both sides together");
      expect(page).toContain("Beginner");
      expect(page).toContain("Cancel Create exercise");
    });

    it("opens a saved exercise's editor with its values", async () => {
      // arrange
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const response = await library.openExercise(COACH_SESSION, squat.id);

      // assert
      expect(response.status).toBe(200);
      const document = await visibleDocument(response);
      expect(document).toContain('value="Back squat"');
      const page = textOf(document);
      expect(page).toContain("Back to exercises Edit exercise");
      expect(page).toContain("Quadriceps Glutes");
      expect(page).toContain("Intermediate");
      expect(page).toContain("Brace, then sit between the hips.");
      expect(page).toContain("Cancel Save changes");
    });

    it.each([
      ["an unknown exercise", UNKNOWN_ID],
      ["an id that is not a uuid", NOT_A_UUID],
    ])("returns her to the library for %s", async (_case, exerciseId) => {
      // arrange, act
      const response = await library.openExercise(COACH_SESSION, exerciseId);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(LIBRARY_PAGE));
    });

    it("refuses a signed-in client on the library and both editor pages", async () => {
      // arrange
      await rig.provisionClient();
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);

      // act
      const answers = await Promise.all([
        library.openLibrary(CLIENT_SESSION),
        library.openNewExercise(CLIENT_SESSION),
        library.openExercise(CLIENT_SESSION, squat.id),
      ]);

      // assert
      expect(answers.map(({ status }) => status)).toEqual([403, 403, 403]);
    });

    it("sends a signed-out visitor to sign in from the library and both editor pages", async () => {
      // arrange
      const squat = await library.createAccepted(COACH_SESSION, BACK_SQUAT);
      const pages = [
        LIBRARY_PAGE,
        `${LIBRARY_PAGE}/exercises/new`,
        `${LIBRARY_PAGE}/exercises/${squat.id}`,
      ];

      // act
      const answers = await Promise.all([
        library.openLibrary(VISITOR),
        library.openNewExercise(VISITOR),
        library.openExercise(VISITOR, squat.id),
      ]);

      // assert
      expect(
        answers.map((answer) => [
          answer.status,
          answer.headers.get("location"),
        ]),
      ).toEqual(
        pages.map((page) => [
          302,
          `https://evoa.fit/sign-in?redirect_url=${encodeURIComponent(
            `https://localhost:3000${suite.path(page)}`,
          )}`,
        ]),
      );
    });
  });
});

async function pageTextOf(response: Response): Promise<string> {
  return textOf(await visibleDocument(response));
}

function textOf(document: string): string {
  return textNodesOf(document)
    .filter((text) => text.length > 0)
    .join(" ");
}
