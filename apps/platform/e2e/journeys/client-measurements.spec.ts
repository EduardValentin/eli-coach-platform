import { expect, test } from "../support/fixtures";
import type {
  MeasurementField,
  MeasurementFieldPrompt,
} from "../support/measurements-sheet";
import { CADENCE_HINT } from "../support/client-profile-page";
import { daysBefore } from "../support/paid-clients";
import {
  cameraPhotoOf,
  OVERSIZED_PHOTO,
  samplePhotoOf,
  UNPROCESSABLE_PHOTO,
  UNSUPPORTED_TYPE_PHOTO,
} from "../support/sample-photos";
import {
  isReadableJpeg,
  readServedPhoto,
  storedPhotoFilesOf,
} from "../support/served-photos";
import { FIRST_MEASUREMENTS } from "../support/submitted-clients";
import { setDesktopViewport, setPhoneViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 180_000;
const WEIGH_IN_DUE = "Your weekly weigh-in is due";
const MEASUREMENTS_DUE = "Time for your measurements and photos";
const CLIENT_PRIVACY_LINE = "Only you and your coach can see these photos.";

const WEIGH_IN = { weightKg: 65.4, waistCm: 73.5 };
const LATEST_FULL_SET = {
  weightKg: 65.2,
  waistCm: 73,
  hipsCm: 97.5,
  thighCm: 56.5,
  armCm: 28,
};

const IMPERIAL_PROMPTS: Record<MeasurementField, MeasurementFieldPrompt> = {
  Weight: {
    unit: "lb",
    requirement: "required",
    instruction:
      "First thing in the morning, before eating, after the bathroom.",
  },
  Waist: {
    unit: "in",
    requirement: "required",
    instruction:
      "Narrowest point, usually just above the belly button. Relaxed, don't pull the tape tight.",
  },
  Hips: { unit: "in", requirement: "optional", instruction: "Widest point." },
  Thigh: {
    unit: "in",
    requirement: "optional",
    instruction: "Mid-thigh, same leg every time.",
  },
  Arm: {
    unit: "in",
    requirement: "optional",
    instruction: "Relaxed, mid-bicep.",
  },
};

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

const dayMonthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

test("a client finds her profile from the sidebar, her name and the tab bar and reads her history newest first in kilograms and centimetres", async ({
  clientDashboard,
  clientPortalShell,
  clientProfile,
  page,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  const yesterday = daysBefore(now, 1);
  const client = await provisionMeasuredClient({
    system: "metric",
    photoConsent: "not-given",
    entries: [
      { recordedAt: daysBefore(now, 40), values: FIRST_MEASUREMENTS },
      { recordedAt: daysBefore(now, 20), values: WEIGH_IN },
      { recordedAt: yesterday, values: LATEST_FULL_SET },
    ],
  });
  const history = [
    [
      dayMonthFormatter.format(yesterday),
      "65.2 kg",
      "73 cm",
      "97.5 cm",
      "56.5 cm",
      "28 cm",
    ],
    [
      dayMonthFormatter.format(daysBefore(now, 20)),
      "65.4 kg",
      "73.5 cm",
      "—",
      "—",
      "—",
    ],
    [
      dayMonthFormatter.format(daysBefore(now, 40)),
      "66.1 kg",
      "74 cm",
      "98 cm",
      "57 cm",
      "28 cm",
    ],
  ];
  await page.goto("/store");
  await signIn();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectNoNudge();

  // act
  await clientPortalShell.openProfileFromSidebar();

  // assert
  await clientProfile.expectOpen();
  await clientPortalShell.expectProfileCurrent();
  await clientProfile.expectHistory(history);
  await clientProfile.expectNoViewPhotos(dayMonthFormatter.format(yesterday));

  // act
  await clientDashboard.open();
  await clientPortalShell.openProfileFromSidebarName(client.fullName);

  // assert
  await clientProfile.expectOpen();

  // act
  await setPhoneViewport(page);
  await clientDashboard.open();
  await clientPortalShell.openProfileFromTabs();

  // assert
  await clientProfile.expectOpen();
  await clientPortalShell.expectProfileCurrent();
  await clientProfile.expectHistory(history);

  // act
  await clientDashboard.open();
  await clientPortalShell.openProfileFromTopBarName(client.fullName);

  // assert
  await clientProfile.expectOpen();

  // act
  await clientDashboard.open();
  await clientPortalShell.openMore();
  await clientPortalShell.openProfileFromMoreSheetName(client.fullName);

  // assert
  await clientPortalShell.expectSheetClosed();
  await clientProfile.expectOpen();
});

test("a client follows her weigh-in reminder and adds a fresh set in pounds and inches from her last values, and the earlier set stays as it was", async ({
  clientDashboard,
  clientProfile,
  measurementRecords,
  measurementsSheet,
  page,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  const today = dayMonthFormatter.format(now);
  const eightDaysAgo = daysBefore(now, 8);
  const client = await provisionMeasuredClient({
    system: "imperial",
    photoConsent: "not-given",
    entries: [{ recordedAt: eightDaysAgo, values: FIRST_MEASUREMENTS }],
  });
  const earlierRow = [
    dayMonthFormatter.format(eightDaysAgo),
    "145.7 lb",
    "29.25 in",
    "38.5 in",
    "22.5 in",
    "11 in",
  ];
  await page.goto("/store");
  await signIn();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectOnlyNudge(WEIGH_IN_DUE);

  // act
  await clientDashboard.followNudge(WEIGH_IN_DUE);

  // assert
  await clientProfile.expectOpen();
  await clientProfile.expectHistory([earlierRow]);

  // act
  await clientProfile.openAdd();

  // assert
  await measurementsSheet.expectOpen();
  await measurementsSheet.expectPrompts(IMPERIAL_PROMPTS);
  await measurementsSheet.expectPrefilled({
    Weight: "145.7",
    Waist: "29.25",
    Hips: "38.5",
    Thigh: "22.5",
    Arm: "11",
  });
  await measurementsSheet.expectPhotosLocked();

  // act
  await measurementsSheet.fill({ Weight: "700", Waist: "", Hips: "10" });
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectProblem(
    "Weight",
    "Enter a weight between 66 and 661 lb.",
  );
  await measurementsSheet.expectProblem("Waist", "Enter a measurement.");
  await measurementsSheet.expectProblem(
    "Hips",
    "Enter a measurement between 20 and 79 in.",
  );
  expect(await measurementRecords.entries(client.clientId)).toHaveLength(1);

  // act
  await measurementsSheet.fill({
    Weight: "144",
    Waist: "29",
    Hips: "38.5",
    Thigh: "",
  });
  await measurementsSheet.agreeToPhotos();
  await measurementsSheet.addPhoto("front", UNPROCESSABLE_PHOTO);
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectSavedToast();
  await measurementsSheet.expectRefusedToast("front");
  await measurementsSheet.expectClosed();
  await clientProfile.expectHistory([
    [today, "144 lb", "29 in", "38.5 in", "—", "11 in"],
    earlierRow,
  ]);
  await clientProfile.expectNoViewPhotos(today);
  expect(await measurementRecords.entries(client.clientId)).toEqual([
    {
      recordedAt: eightDaysAgo,
      weightKg: "66.10",
      waistCm: "74.0",
      hipsCm: "98.0",
      thighCm: "57.0",
      armCm: "28.0",
    },
    {
      recordedAt: expect.any(Date),
      weightKg: "65.32",
      waistCm: "73.5",
      hipsCm: "98.0",
      thighCm: null,
      armCm: "28.0",
    },
  ]);
  expect(await measurementRecords.photos(client.clientId)).toEqual([]);
  expect(
    await measurementRecords.photosConsentedAt(client.clientId),
  ).toBeInstanceOf(Date);

  // act
  await clientProfile.openAdd();

  // assert
  await measurementsSheet.expectConsentAlreadyGiven(
    dayMonthYearFormatter.format(now),
  );
  await measurementsSheet.expectPrefilled({
    Weight: "144",
    Waist: "29",
    Hips: "38.5",
    Thigh: "",
    Arm: "11",
  });

  // act
  await measurementsSheet.cancel();

  // assert
  await measurementsSheet.expectClosed();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectNoNudge();
});

test("a client who agreed at onboarding adds front, side and back photos, views them together and removes them one by one", async ({
  clientDashboard,
  clientPortalShell,
  clientProfile,
  measurementRecords,
  measurementsSheet,
  page,
  photoView,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  const today = dayMonthFormatter.format(now);
  const tenDaysAgo = dayMonthFormatter.format(daysBefore(now, 10));
  const client = await provisionMeasuredClient({
    system: "metric",
    photoConsent: "given",
    entries: [
      { recordedAt: daysBefore(now, 30), values: FIRST_MEASUREMENTS },
      { recordedAt: daysBefore(now, 10), values: WEIGH_IN },
    ],
  });
  const latestRow = [today, "65.4 kg", "73.5 cm", "97 cm", "56 cm", "27.5 cm"];
  await page.goto("/store");
  await signIn();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectOnlyNudge(MEASUREMENTS_DUE);

  // act
  await clientDashboard.followNudge(MEASUREMENTS_DUE);
  await clientProfile.openAdd();

  // assert
  await measurementsSheet.expectConsentAlreadyGiven(
    dayMonthYearFormatter.format(client.submittedAt),
  );
  await measurementsSheet.expectPrefilled({
    Weight: "65.4",
    Waist: "73.5",
    Hips: "",
    Thigh: "",
    Arm: "",
  });

  // act
  await measurementsSheet.addPhoto("front", samplePhotoOf("front"));
  await measurementsSheet.addPhoto("side", samplePhotoOf("side"));
  await measurementsSheet.addPhoto("back", samplePhotoOf("back"));

  // assert
  await measurementsSheet.expectPreview("front");
  await measurementsSheet.expectPreview("side");
  await measurementsSheet.expectPreview("back");

  // act
  await measurementsSheet.removePreview("side");

  // assert
  await measurementsSheet.expectNoPreview("side");

  // act
  await measurementsSheet.addPhoto("side", UNSUPPORTED_TYPE_PHOTO);

  // assert
  await measurementsSheet.expectRefusal();
  await measurementsSheet.expectNoPreview("side");

  // act
  await measurementsSheet.addPhoto("side", OVERSIZED_PHOTO);

  // assert
  await measurementsSheet.expectRefusal();
  await measurementsSheet.expectNoPreview("side");

  // act
  await measurementsSheet.addPhoto("side", samplePhotoOf("side"));

  // assert
  await measurementsSheet.expectPreview("side");
  await measurementsSheet.expectNoRefusal();

  // act
  await measurementsSheet.fill({ Hips: "97", Thigh: "56", Arm: "27.5" });
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectSavedToast();
  await measurementsSheet.expectNoRefusedToast();
  await measurementsSheet.expectClosed();
  await clientProfile.expectViewPhotos(today);
  await clientProfile.expectNoViewPhotos(tenDaysAgo);
  expect(await measurementRecords.photos(client.clientId)).toEqual([
    { view: "back", mimeType: "image/jpeg" },
    { view: "front", mimeType: "image/jpeg" },
    { view: "side", mimeType: "image/jpeg" },
  ]);

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectNoNudge();

  // act
  await clientPortalShell.openProfileFromSidebar();
  await photoView.openWithKeyboardFor(today);

  // assert
  await photoView.expectOpenFor(today, CLIENT_PRIVACY_LINE);
  await photoView.expectPhotos(["front", "side", "back"]);
  await photoView.expectRemoveOffered(["front", "side", "back"]);
  await photoView.expectFocusKeptInside();

  // act
  await photoView.closeWithEscape();

  // assert
  await photoView.expectClosed();
  await photoView.expectFocusReturnedTo(today);

  // act
  await photoView.openFor(today);
  await photoView.askToRemove("front");
  await photoView.keep();

  // assert
  await photoView.expectPhotos(["front", "side", "back"]);

  // act
  await photoView.askToRemove("front");
  await photoView.confirmRemoval();

  // assert
  await photoView.expectPhotos(["side", "back"]);
  expect(await measurementRecords.photos(client.clientId)).toEqual([
    { view: "back", mimeType: "image/jpeg" },
    { view: "side", mimeType: "image/jpeg" },
  ]);

  // act
  await photoView.askToRemove("side");
  await photoView.confirmRemoval();
  await photoView.askToRemove("back");
  await photoView.confirmRemoval();

  // assert
  await photoView.expectPhotos([]);
  await photoView.expectNoRemove();
  expect(await measurementRecords.photos(client.clientId)).toEqual([]);

  // act
  await photoView.close();

  // assert
  await photoView.expectClosed();
  await clientProfile.expectNoViewPhotos(today);
  await clientProfile.expectHistory([
    latestRow,
    [tenDaysAgo, "65.4 kg", "73.5 cm", "—", "—", "—"],
    [
      dayMonthFormatter.format(daysBefore(now, 30)),
      "66.1 kg",
      "74 cm",
      "98 cm",
      "57 cm",
      "28 cm",
    ],
  ]);
});

test("a client with nothing recorded yet adds her first set on her phone, and a save that no longer reaches her account keeps the sheet open", async ({
  clientDashboard,
  clientPortalShell,
  clientProfile,
  measurementRecords,
  measurementsSheet,
  page,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const today = dayMonthFormatter.format(new Date());
  const client = await provisionMeasuredClient({
    system: "metric",
    photoConsent: "not-given",
    entries: [],
  });
  await page.goto("/store");
  await signIn();
  await setPhoneViewport(page);

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectNoNudge();

  // act
  await clientPortalShell.openProfileFromTabs();

  // assert
  await clientProfile.expectOpen();
  await clientProfile.expectEmpty();

  // act
  await clientProfile.openAddFirst();

  // assert
  await measurementsSheet.expectOpen();
  await measurementsSheet.expectPrefilled({
    Weight: "",
    Waist: "",
    Hips: "",
    Thigh: "",
    Arm: "",
  });
  await measurementsSheet.expectPhotosLocked();

  // act
  await measurementsSheet.fill({ Weight: "63.4", Waist: "71" });
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectSavedToast();
  await measurementsSheet.expectClosed();
  await clientProfile.expectHistory([
    [today, "63.4 kg", "71 cm", "—", "—", "—"],
  ]);

  // arrange
  await clientProfile.openAdd();
  await page.context().clearCookies();

  // act
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectFailedToast();
  await measurementsSheet.expectOpen();
  expect(await measurementRecords.entries(client.clientId)).toHaveLength(1);
});

test("a client's camera photos are stored without their metadata, at a bounded size and unreadable on disk, open only uncached for her and the coach, and a removed one is gone for both", async ({
  clientProfile,
  coachClient,
  measurementRecords,
  measurementsSheet,
  page,
  photoRequests,
  photoView,
  provisionCoach,
  provisionMeasuredClient,
  publicNav,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  const today = dayMonthFormatter.format(now);
  const metadataMarker = `gen207-qa-metadata-${now.getTime()}`;
  const frontPhoto = await cameraPhotoOf("front", "jpeg", metadataMarker);
  const sidePhoto = await cameraPhotoOf("side", "webp", metadataMarker);
  await provisionCoach();
  const client = await provisionMeasuredClient({
    system: "metric",
    photoConsent: "given",
    entries: [{ recordedAt: daysBefore(now, 30), values: FIRST_MEASUREMENTS }],
  });
  await page.goto("/store");
  await signIn();

  // act
  await clientProfile.open();

  // assert
  await clientProfile.expectAccessibleHistory();
  await clientProfile.expectNoCadenceHint();

  // act
  await clientProfile.openAdd();

  // assert
  await measurementsSheet.expectPhotoTilesAreLabelledFileInputs();
  await measurementsSheet.expectNoCadenceHint(CADENCE_HINT);

  // act
  await measurementsSheet.addPhoto("front", frontPhoto);
  await measurementsSheet.addPhoto("side", sidePhoto);

  // assert
  await measurementsSheet.expectPreview("front");
  await measurementsSheet.expectPreview("side");

  // act
  await measurementsSheet.save();

  // assert
  await measurementsSheet.expectSavedToast();
  await measurementsSheet.expectNoRefusedToast();
  await measurementsSheet.expectClosed();
  await clientProfile.expectViewPhotos(today);
  await clientProfile.expectNoThumbnails();
  expect(await measurementRecords.photos(client.clientId)).toEqual([
    { view: "front", mimeType: "image/jpeg" },
    { view: "side", mimeType: "image/jpeg" },
  ]);

  // act
  const frontPhotoId = await measurementRecords.photoIdOf(
    client.clientId,
    "front",
  );
  const sidePhotoId = await measurementRecords.photoIdOf(
    client.clientId,
    "side",
  );
  const servedFront = await photoRequests.download(frontPhotoId);
  const servedSide = await photoRequests.download(sidePhotoId);
  const storedFiles = storedPhotoFilesOf(client.clientId);

  // assert
  for (const served of [servedFront, servedSide]) {
    expect(served.status).toBe(200);
    expect(served.headers).toMatchObject({
      "cache-control": "private, no-store",
      "content-type": "image/jpeg",
      "x-content-type-options": "nosniff",
    });
    expect(await readServedPhoto(served.body)).toEqual({
      format: "jpeg",
      width: 1600,
      height: 1200,
      carriesMetadata: false,
    });
    expect(served.body.includes(metadataMarker)).toBe(false);
  }
  expect(storedFiles).toHaveLength(2);
  for (const stored of storedFiles) {
    expect(isReadableJpeg(stored)).toBe(false);
    expect(stored.includes(metadataMarker)).toBe(false);
    expect(stored.equals(servedFront.body)).toBe(false);
    expect(stored.equals(servedSide.body)).toBe(false);
  }

  // act
  await setPhoneViewport(page);
  await photoView.openFor(today);

  // assert
  await photoView.expectPhotos(["front", "side"]);

  // act
  await photoView.askToRemove("front");
  await photoView.confirmRemoval();
  await photoView.close();

  // assert
  await photoView.expectClosed();
  expect((await photoRequests.open(frontPhotoId)).status).toBe(404);
  expect(storedPhotoFilesOf(client.clientId)).toHaveLength(1);

  // arrange
  await setDesktopViewport(page);
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signInAsCoach();
  await setPhoneViewport(page);

  // act
  await coachClient.open(client.clientId);
  await photoView.openWithKeyboardFor(today);

  // assert
  await photoView.expectPhotos(["side"]);
  await photoView.expectNoRemove();
  await photoView.expectFocusKeptInside();

  // act
  await photoView.closeWithEscape();

  // assert
  await photoView.expectClosed();
  await photoView.expectFocusReturnedTo(today);
  expect((await photoRequests.open(frontPhotoId)).status).toBe(404);
  expect((await photoRequests.open(sidePhotoId)).status).toBe(200);
});

test("a client who has only ever weighed in is asked for her measurements and photos 28 days after her first entry", async ({
  clientDashboard,
  page,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  await provisionMeasuredClient({
    system: "metric",
    photoConsent: "not-given",
    entries: [
      { recordedAt: daysBefore(now, 29), values: WEIGH_IN },
      { recordedAt: daysBefore(now, 3), values: WEIGH_IN },
    ],
  });
  await page.goto("/store");
  await signIn();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectOnlyNudge(MEASUREMENTS_DUE);
});

test("a client who has only weighed in for under 28 days, last this week, sees no reminder", async ({
  clientDashboard,
  page,
  provisionMeasuredClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  await provisionMeasuredClient({
    system: "metric",
    photoConsent: "not-given",
    entries: [
      { recordedAt: daysBefore(now, 27), values: WEIGH_IN },
      { recordedAt: daysBefore(now, 3), values: WEIGH_IN },
    ],
  });
  await page.goto("/store");
  await signIn();

  // act
  await clientDashboard.open();

  // assert
  await clientDashboard.expectNoNudge();
});
