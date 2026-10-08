import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  ApiIntegrationTestSuite,
  CLIENT_MEDIA_KEY_ID,
} from "~integration-test-config/api-integration-test-suite";
import {
  CLIENT_PORTAL,
  ClientOnboardingJourney,
  completeAnswers,
  givenConsents,
  REGULAR_LAST_PERIOD_START,
  regularSubmission,
  type OnboardingSubmission,
} from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  SECOND_PURCHASE,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  MeasurementsJourney,
  type PhotoPart,
  type ProgressPhotoRow,
} from "~integration-test-config/measurements-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  tableBodyRowsIn,
  textNodesOf,
  visibleDocument,
} from "~integration-test-config/rendered-page";
import {
  cameraJpegWithOrientationAndLocation,
  imageFactsOf,
  landscapePng,
  smallWebp,
} from "~integration-test-config/sample-images";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const measurements = new MeasurementsJourney(rig);

const OWNER: AccountSession = {
  sessionId: "sess_measurements_owner",
  subjectId: "user_measurements_owner",
};

const STRANGER: AccountSession = {
  sessionId: "sess_measurements_stranger",
  subjectId: "user_measurements_stranger",
};

const MARIA: Visitor = {
  email: "maria.measurements@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const NEXT_DAY = daysAfter(CALL_ENDED_INSTANT, 1);
const TWO_DAYS_LATER = daysAfter(CALL_ENDED_INSTANT, 2);
const ONBOARDING_PHOTO_CONSENT = new Date("2026-10-20T18:00:00.000Z");
const NOT_A_PHOTO_ID = "not-a-photo-id";
const MEASUREMENTS_CAPTION = "Measurements history, newest first";
const WEIGHT_COLUMN = 1;
const RATIO_COLUMN = 6;
const WEIGH_IN_DUE = "Your weekly weigh-in is due";
const MEASUREMENTS_DUE = "Time for your measurements and photos";

const WEEKLY_WEIGH_IN = { weightKg: 65.4, waistCm: 73.5 };
const FULL_MEASUREMENTS = {
  weightKg: 65.2,
  waistCm: 73,
  hipsCm: 97.5,
  armCm: 28,
};

describe.sequential("client measurements integration", () => {
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

  describe("recording an entry", () => {
    it("records an entry without photos beside her onboarding entry", async () => {
      // arrange
      const clientId = await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);

      // act
      const response = await measurements.recordMeasurements(OWNER, {
        values: WEEKLY_WEIGH_IN,
      });

      // assert
      expect(response.status).toBe(201);
      const recorded = await response.json();
      expect(recorded).toEqual({
        entryId: expect.any(String),
        photos: { front: "absent", side: "absent", back: "absent" },
      });
      expect(await measurements.entryRowsOf(clientId)).toEqual([
        expect.objectContaining({ recordedAt: CALL_ENDED_INSTANT }),
        {
          id: recorded.entryId,
          recordedAt: NEXT_DAY,
          weightKg: "65.40",
          waistCm: "73.5",
          hipsCm: null,
        },
      ]);
      expect(await measurements.photoRowsOf(clientId)).toEqual([]);
      expect(await measurements.storedFileCountOf(clientId)).toBe(0);
    });

    it("stores each photo encrypted as an upright, bounded JPEG without its metadata", async () => {
      // arrange
      const clientId = await admitSubmittedClient();
      const cameraJpeg = await cameraJpegWithOrientationAndLocation();
      expect((await imageFactsOf(cameraJpeg)).hasExif).toBe(true);
      await rig.holdClock(NEXT_DAY);

      // act
      const recorded = await measurements.recordAccepted(OWNER, {
        values: FULL_MEASUREMENTS,
        consent: "given",
        photos: {
          front: photoPart(cameraJpeg, "front.jpg", "image/jpeg"),
          side: photoPart(await landscapePng(), "side.png", "image/png"),
          back: photoPart(await smallWebp(), "back.webp", "image/webp"),
        },
      });

      // assert
      expect(recorded.photos).toEqual({
        front: "stored",
        side: "stored",
        back: "stored",
      });
      const photos = await measurements.photoRowsOf(clientId);
      const stored = await Promise.all(photos.map(withRendition));
      expect(photos.map((photo) => photo.view)).toEqual([
        "back",
        "front",
        "side",
      ]);
      expect(photos).toEqual(
        Array(3).fill(
          expect.objectContaining({
            entryId: recorded.entryId,
            keyId: CLIENT_MEDIA_KEY_ID,
            mimeType: "image/jpeg",
          }),
        ),
      );
      expect(
        await Promise.all(
          stored.map(({ rendition }) => imageFactsOf(rendition)),
        ),
      ).toEqual([
        { format: "jpeg", width: 640, height: 480, hasExif: false },
        { format: "jpeg", width: 1200, height: 1600, hasExif: false },
        { format: "jpeg", width: 1600, height: 1200, hasExif: false },
      ]);
      for (const { photo, rendition } of stored) {
        const storedFile = await measurements.storedFileOf(photo);

        expect(photo.sizeBytes).toBe(rendition.byteLength);
        expect(storedFile).not.toBeNull();
        expect(storedFile?.includes(rendition.subarray(0, 64))).toBe(false);
      }
    });

    it.each([
      {
        refusal: "a text file named as a JPEG",
        part: photoPart(Buffer.from("not a photo"), "front.jpg", "text/plain"),
      },
      {
        refusal: "text bytes labelled as a JPEG",
        part: photoPart(Buffer.from("not a photo"), "front.jpg", "image/jpeg"),
      },
    ])(
      "saves the entry and refuses $refusal without storing anything",
      async ({ part }) => {
        // arrange
        const clientId = await admitSubmittedClient();
        await rig.holdClock(NEXT_DAY);

        // act
        const response = await measurements.recordMeasurements(OWNER, {
          values: WEEKLY_WEIGH_IN,
          consent: "given",
          photos: { front: part },
        });

        // assert
        expect(response.status).toBe(201);
        const recorded = await response.json();
        expect(recorded.photos).toEqual({
          front: "refused",
          side: "absent",
          back: "absent",
        });
        expect(await measurements.entryRowsOf(clientId)).toContainEqual(
          expect.objectContaining({ id: recorded.entryId }),
        );
        expect(await measurements.photoRowsOf(clientId)).toEqual([]);
        expect(await measurements.storedFileCountOf(clientId)).toBe(0);
      },
    );

    it("refuses her photos until she has agreed to share them, and keeps the entry", async () => {
      // arrange
      const clientId = await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);

      // act
      const recorded = await measurements.recordAccepted(OWNER, {
        values: WEEKLY_WEIGH_IN,
        photos: { front: await frontJpeg() },
      });

      // assert
      expect(recorded.photos.front).toBe("refused");
      expect(await measurements.entryRowsOf(clientId)).toHaveLength(2);
      expect(await measurements.photoRowsOf(clientId)).toEqual([]);
      expect(await measurements.storedFileCountOf(clientId)).toBe(0);
      expect(await measurements.photoConsentOf(clientId)).toBeNull();
    });

    it("answers 400 to values outside the onboarding ranges and records nothing", async () => {
      // arrange
      const clientId = await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);

      // act
      const response = await measurements.recordMeasurements(OWNER, {
        values: { weightKg: 5, waistCm: 73 },
      });

      // assert
      expect(response.status).toBe(400);
      expect(await measurements.entryRowsOf(clientId)).toHaveLength(1);
    });

    it("answers 404 to a signed-in client who is not on a coaching journey", async () => {
      // arrange
      await rig.provisionClient();

      // act
      const response = await measurements.recordMeasurements(CLIENT_SESSION, {
        values: WEEKLY_WEIGH_IN,
      });

      // assert
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not-on-journey" });
    });

    it("keeps the coach out", async () => {
      // arrange, act
      const response = await measurements.recordMeasurements(COACH_SESSION, {
        values: WEEKLY_WEIGH_IN,
      });

      // assert
      expect(response.status).toBe(403);
    });

    it("asks an anonymous visitor to sign in", async () => {
      // arrange, act
      const response = await measurements.recordMeasurementsAnonymously({
        values: WEEKLY_WEIGH_IN,
      });

      // assert
      expect(response.status).toBe(401);
    });
  });

  describe("photo consent", () => {
    it("records the day she agrees in the sheet and keeps it for her later entries", async () => {
      // arrange
      const clientId = await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);

      // act
      await measurements.recordAccepted(OWNER, {
        values: WEEKLY_WEIGH_IN,
        consent: "given",
      });
      await rig.holdClock(TWO_DAYS_LATER);
      const later = await measurements.recordAccepted(OWNER, {
        values: WEEKLY_WEIGH_IN,
        photos: { front: await frontJpeg() },
      });

      // assert
      expect(await measurements.photoConsentOf(clientId)).toEqual(NEXT_DAY);
      expect(later.photos.front).toBe("stored");
    });

    it("carries the agreement she gave in her onboarding into her profile", async () => {
      // arrange
      const clientId = await admitSubmittedClient(photoConsentingSubmission());
      await rig.holdClock(NEXT_DAY);

      // act
      const recorded = await measurements.recordAccepted(OWNER, {
        values: WEEKLY_WEIGH_IN,
        photos: { front: await frontJpeg() },
      });

      // assert
      expect(await measurements.photoConsentOf(clientId)).toEqual(
        ONBOARDING_PHOTO_CONSENT,
      );
      expect(recorded.photos.front).toBe("stored");
    });
  });

  describe("opening a photo", () => {
    it("streams her photo to her without letting anything cache or sniff it", async () => {
      // arrange
      const { photo } = await consentingClientWithFrontPhoto();

      // act
      const response = await measurements.openPhoto(OWNER, photo.id);

      // assert
      expect(response.status).toBe(200);
      const body = Buffer.from(await response.arrayBuffer());
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("content-type")).toBe("image/jpeg");
      expect(response.headers.get("content-length")).toBe(
        String(body.byteLength),
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toContain(
        "sandbox",
      );
      expect(response.headers.get("cross-origin-resource-policy")).toBe(
        "same-origin",
      );
      expect((await imageFactsOf(body)).format).toBe("jpeg");
    });

    it("streams her photo to the coach", async () => {
      // arrange
      const { photo } = await consentingClientWithFrontPhoto();

      // act
      const response = await measurements.openPhoto(COACH_SESSION, photo.id);

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    it("answers 404 to another client", async () => {
      // arrange
      const { photo } = await consentingClientWithFrontPhoto();
      await admitStranger();
      await rig.holdClock(TWO_DAYS_LATER);

      // act
      const response = await measurements.openPhoto(STRANGER, photo.id);

      // assert
      expect(response.status).toBe(404);
    });

    it("asks an anonymous visitor to sign in", async () => {
      // arrange
      const { photo } = await consentingClientWithFrontPhoto();

      // act
      const response = await measurements.openPhotoAnonymously(photo.id);

      // assert
      expect(response.status).toBe(401);
    });

    it("answers 404 to an id that is not a photo id", async () => {
      // arrange
      await admitSubmittedClient();

      // act
      const response = await measurements.openPhoto(OWNER, NOT_A_PHOTO_ID);

      // assert
      expect(response.status).toBe(404);
    });
  });

  describe("removing a photo", () => {
    it("deletes her photo and its file together and keeps the entry", async () => {
      // arrange
      const { clientId, entryId, photo } =
        await consentingClientWithFrontPhoto();

      // act
      const removed = await measurements.removePhoto(OWNER, photo.id);
      const removedAgain = await measurements.removePhoto(OWNER, photo.id);
      const reopened = await measurements.openPhoto(OWNER, photo.id);

      // assert
      expect(removed.status).toBe(204);
      expect(removedAgain.status).toBe(404);
      expect(reopened.status).toBe(404);
      expect(await measurements.photoRowsOf(clientId)).toEqual([]);
      expect(await measurements.storedFileOf(photo)).toBeNull();
      expect(await measurements.entryRowsOf(clientId)).toContainEqual(
        expect.objectContaining({ id: entryId }),
      );
    });

    it("answers 404 to the coach and keeps the photo", async () => {
      // arrange
      const { clientId, photo } = await consentingClientWithFrontPhoto();

      // act
      const response = await measurements.removePhoto(COACH_SESSION, photo.id);

      // assert
      expect(response.status).toBe(404);
      expect(await measurements.photoRowsOf(clientId)).toEqual([photo]);
      expect(await measurements.storedFileOf(photo)).not.toBeNull();
    });

    it("answers 404 to another client and keeps the photo", async () => {
      // arrange
      const { clientId, photo } = await consentingClientWithFrontPhoto();
      await admitStranger();
      await rig.holdClock(TWO_DAYS_LATER);

      // act
      const response = await measurements.removePhoto(STRANGER, photo.id);

      // assert
      expect(response.status).toBe(404);
      expect(await measurements.photoRowsOf(clientId)).toEqual([photo]);
    });

    it("asks an anonymous visitor to sign in and keeps the photo", async () => {
      // arrange
      const { clientId, photo } = await consentingClientWithFrontPhoto();

      // act
      const response = await measurements.removePhotoAnonymously(photo.id);

      // assert
      expect(response.status).toBe(401);
      expect(await measurements.photoRowsOf(clientId)).toEqual([photo]);
    });
  });

  describe("the coach's client page", () => {
    it("offers View photos only on the entries that have photos", async () => {
      // arrange
      const clientId = await admitSubmittedClient(photoConsentingSubmission());
      await rig.holdClock(NEXT_DAY);
      await measurements.recordAccepted(OWNER, {
        values: WEEKLY_WEIGH_IN,
        photos: { front: await frontJpeg() },
      });
      await rig.holdClock(TWO_DAYS_LATER);
      await measurements.recordAccepted(OWNER, { values: WEEKLY_WEIGH_IN });

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        coachClientPage(clientId),
      );

      // assert
      expect(response.status).toBe(200);
      const page = await visibleDocument(response);
      expect(page).toContain("View photos from 22 October");
      expect(page).not.toContain("View photos from 23 October");
      expect(page).not.toContain("View photos from 21 October");
    });

    it("shows the waist-to-height ratio on each entry", async () => {
      // arrange
      const clientId = await admitSubmittedClient();

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        coachClientPage(clientId),
      );

      // assert
      expect(response.status).toBe(200);
      const [onboardingEntry] = tableBodyRowsIn(
        await visibleDocument(response),
        MEASUREMENTS_CAPTION,
      );
      expect(onboardingEntry?.[WEIGHT_COLUMN]).toBe("66.1 kg");
      expect(onboardingEntry?.[RATIO_COLUMN]).toBe("0.45");
    });

    it("blanks the ratio while she is pregnant", async () => {
      // arrange
      const clientId = await admitSubmittedClient(pregnantSubmission());

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        coachClientPage(clientId),
      );

      // assert
      expect(response.status).toBe(200);
      const [onboardingEntry] = tableBodyRowsIn(
        await visibleDocument(response),
        MEASUREMENTS_CAPTION,
      );
      expect(onboardingEntry?.[WEIGHT_COLUMN]).toBe("66.1 kg");
      expect(onboardingEntry?.[RATIO_COLUMN]).toBe("—");
    });
  });

  describe("the dashboard nudge", () => {
    it("says nothing a day after her latest entry", async () => {
      // arrange
      await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);
      await measurements.recordAccepted(OWNER, { values: WEEKLY_WEIGH_IN });
      await rig.holdClock(daysAfter(NEXT_DAY, 1));

      // act
      const response = await rig.requestAs(OWNER, CLIENT_PORTAL);

      // assert
      expect(response.status).toBe(200);
      const texts = textNodesOf(await visibleDocument(response));
      expect(texts).not.toContain(WEIGH_IN_DUE);
      expect(texts).not.toContain(MEASUREMENTS_DUE);
    });

    it("asks for her weekly weigh-in seven days after her latest entry", async () => {
      // arrange
      await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);
      await measurements.recordAccepted(OWNER, { values: WEEKLY_WEIGH_IN });
      await rig.holdClock(daysAfter(NEXT_DAY, 7));

      // act
      const response = await rig.requestAs(OWNER, CLIENT_PORTAL);

      // assert
      expect(response.status).toBe(200);
      const texts = textNodesOf(await visibleDocument(response));
      expect(texts).toContain(WEIGH_IN_DUE);
      expect(texts).not.toContain(MEASUREMENTS_DUE);
    });

    it("asks for her measurements and photos 28 days after her latest entry with hips", async () => {
      // arrange
      await admitSubmittedClient();
      await rig.holdClock(NEXT_DAY);
      await measurements.recordAccepted(OWNER, { values: FULL_MEASUREMENTS });
      await rig.holdClock(daysAfter(NEXT_DAY, 28));

      // act
      const response = await rig.requestAs(OWNER, CLIENT_PORTAL);

      // assert
      expect(response.status).toBe(200);
      const texts = textNodesOf(await visibleDocument(response));
      expect(texts).toContain(MEASUREMENTS_DUE);
      expect(texts).not.toContain(WEIGH_IN_DUE);
    });
  });
});

type EntryWithFrontPhoto = {
  clientId: string;
  entryId: string;
  photo: ProgressPhotoRow;
};

function daysAfter(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * DAY_IN_MILLISECONDS);
}

function photoConsentingSubmission(): OnboardingSubmission {
  return {
    answers: completeAnswers(REGULAR_LAST_PERIOD_START),
    consents: {
      ...givenConsents(),
      progressPhotosAt: ONBOARDING_PHOTO_CONSENT.toISOString(),
    },
  };
}

function pregnantSubmission(): OnboardingSubmission {
  const answers = completeAnswers(REGULAR_LAST_PERIOD_START);

  return {
    answers: {
      ...answers,
      "cycle-context": { ...answers["cycle-context"], lifeStage: ["Pregnant"] },
    },
    consents: givenConsents(),
  };
}

function coachClientPage(clientId: string): string {
  return `/coach/clients/${clientId}`;
}

function photoPart(
  bytes: Buffer,
  fileName: string,
  mimeType: string,
): PhotoPart {
  return { bytes, fileName, mimeType };
}

async function frontJpeg(): Promise<PhotoPart> {
  return photoPart(
    await cameraJpegWithOrientationAndLocation(),
    "front.jpg",
    "image/jpeg",
  );
}

async function admitSubmittedClient(
  submission: OnboardingSubmission = regularSubmission(),
): Promise<string> {
  await onboarding.admit(ANA, OWNER);
  await onboarding.submitWith(OWNER, submission);

  return onboarding.clientIdOf(OWNER);
}

async function admitStranger(): Promise<void> {
  await onboarding.admit(MARIA, STRANGER, SECOND_PURCHASE);
}

async function consentingClientWithFrontPhoto(): Promise<EntryWithFrontPhoto> {
  const clientId = await admitSubmittedClient(photoConsentingSubmission());
  await rig.holdClock(NEXT_DAY);
  const recorded = await measurements.recordAccepted(OWNER, {
    values: WEEKLY_WEIGH_IN,
    photos: { front: await frontJpeg() },
  });
  const [photo] = await measurements.photoRowsOf(clientId);

  if (!photo) {
    throw new Error("Her front photo was not stored.");
  }

  return { clientId, entryId: recorded.entryId, photo };
}

async function withRendition(
  photo: ProgressPhotoRow,
): Promise<{ photo: ProgressPhotoRow; rendition: Buffer }> {
  return { photo, rendition: await openedRendition(photo) };
}

async function openedRendition(photo: ProgressPhotoRow): Promise<Buffer> {
  const response = await measurements.openPhoto(OWNER, photo.id);

  if (response.status !== 200) {
    throw new Error(
      `Opening her ${photo.view} photo answered ${response.status}.`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
