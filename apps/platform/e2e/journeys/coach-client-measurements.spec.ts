import { expect, test } from "../support/fixtures";
import { daysBefore } from "../support/paid-clients";
import { samplePhotoOf } from "../support/sample-photos";
import { FIRST_MEASUREMENTS } from "../support/submitted-clients";

const JOURNEY_TIMEOUT_MS = 240_000;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test("the coach reads a client's ratio and opens her photos without a way to remove them, and nobody else can open or remove them", async ({
  clientProfile,
  coachClient,
  measurementRecords,
  measurementsSheet,
  page,
  photoRequests,
  photoView,
  provisionCoach,
  provisionMeasuredClient,
  provisionOtherMeasuredClient,
  publicNav,
  signIn,
  signInAsCoach,
  signInAsOtherClient,
  visitorPhotoRequests,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const now = new Date();
  const today = dayMonthFormatter.format(now);
  const monthAgo = dayMonthFormatter.format(daysBefore(now, 30));
  await provisionCoach();
  const client = await provisionMeasuredClient({
    system: "metric",
    photoConsent: "given",
    entries: [{ recordedAt: daysBefore(now, 30), values: FIRST_MEASUREMENTS }],
  });
  await provisionOtherMeasuredClient({
    system: "metric",
    photoConsent: "not-given",
    entries: [],
  });
  await page.goto("/store");
  await signIn();
  await clientProfile.open();
  await clientProfile.openAdd();
  await measurementsSheet.fill({ Waist: "72" });
  await measurementsSheet.addPhoto("front", samplePhotoOf("front"));
  await measurementsSheet.addPhoto("back", samplePhotoOf("back"));
  await measurementsSheet.save();
  await measurementsSheet.expectSavedToast();
  await photoView.openFor(today);
  await photoView.askToRemove("back");
  await photoView.confirmRemoval();
  await photoView.close();
  const frontPhotoId = await measurementRecords.photoIdOf(
    client.clientId,
    "front",
  );
  await page.goto("/");
  await publicNav.signOut();

  // act
  const visitorOpening = await visitorPhotoRequests.open(frontPhotoId);
  const visitorRemoval = await visitorPhotoRequests.remove(frontPhotoId);

  // assert
  expect([visitorOpening.status, visitorRemoval]).toEqual([401, 401]);

  // arrange
  await page.goto("/store");
  await signInAsOtherClient();

  // act
  const otherClientOpening = await photoRequests.open(frontPhotoId);
  const otherClientRemoval = await photoRequests.remove(frontPhotoId);

  // assert
  expect([otherClientOpening.status, otherClientRemoval]).toEqual([404, 404]);

  // arrange
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(client.clientId);

  // assert
  await coachClient.expectRatio(today, "0.44");
  await coachClient.expectRatio(monthAgo, "0.45");
  await coachClient.expectViewPhotos(today);
  await coachClient.expectNoViewPhotos(monthAgo);

  // act
  await photoView.openFor(today);

  // assert
  await photoView.expectOpenFor(
    today,
    `Only you and ${client.firstName} can see these photos.`,
  );
  await photoView.expectPhotos(["front"]);
  await photoView.expectNoRemove();

  // act
  await photoView.closeWithEscape();

  // assert
  await photoView.expectClosed();
  await photoView.expectFocusReturnedTo(today);

  // act
  const coachOpening = await photoRequests.open(frontPhotoId);
  const coachRemoval = await photoRequests.remove(frontPhotoId);

  // assert
  expect(coachOpening.status).toBe(200);
  expect(coachOpening.headers).toMatchObject({
    "cache-control": "private, no-store",
    "content-type": "image/jpeg",
    "x-content-type-options": "nosniff",
  });
  expect(coachRemoval).toBe(404);
  expect(await measurementRecords.photos(client.clientId)).toEqual([
    { view: "front", mimeType: "image/jpeg" },
  ]);
});

test("the coach reads no ratio for a client whose answers say she is pregnant", async ({
  coachClient,
  page,
  provisionCoach,
  provisionProfiledClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const pregnant = await provisionProfiledClient("flagged");
  const submittedOn = dayMonthFormatter.format(pregnant.submittedAt);
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClient.open(pregnant.clientId);

  // assert
  await coachClient.expectRatio(submittedOn, "—");
  await coachClient.expectNoViewPhotos(submittedOn);
});
