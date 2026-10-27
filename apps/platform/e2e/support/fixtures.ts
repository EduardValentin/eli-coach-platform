import { randomUUID } from "node:crypto";

import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";
import type { AccountRole } from "~/bounded-contexts/access/accounts/domain/account";
import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";
import type pg from "pg";

import { AccountPortal } from "./account-portal";
import { AddResourceDialog } from "./add-resource-dialog";
import { BookingPage } from "./booking-page";
import { CheckInRecords } from "./check-in-records";
import {
  CHECK_IN_PROPOSE_PICKER,
  CHECK_IN_REQUEST_PICKER,
  CHECK_IN_SCHEDULE_PICKER,
  CheckInPickerDialog,
} from "./check-in-picker-dialog";
import { CheckInRequests } from "./check-in-requests";
import { CANCEL_CHECK_IN_LABELS } from "./check-in-rows";
import { ClientCheckInsPage } from "./client-check-ins-page";
import { ClientDashboard } from "./client-dashboard";
import { ClientEndedPage } from "./client-ended-page";
import { ClientOnboarding } from "./client-onboarding";
import { ClientPortalShell } from "./client-portal-shell";
import { ClientProfilePage } from "./client-profile-page";
import { ClientResourcesPage } from "./client-resources-page";
import { ClientSettingsPage } from "./client-settings-page";
import { CoachAssessmentCallsPage } from "./coach-assessment-calls-page";
import { CoachAvailability } from "./coach-availability";
import { CoachCheckInsPage } from "./coach-check-ins-page";
import {
  CoachClientPage,
  STOP_WEEKLY_CHECK_IN_LABELS,
} from "./coach-client-page";
import { ClientResourcesOutage } from "./client-resources-outage";
import { CoachClientProfilePage } from "./coach-client-profile-page";
import { CoachClientResourcesPage } from "./coach-client-resources-page";
import { CoachClientsPage } from "./coach-clients-page";
import { CoachDashboardPage } from "./coach-dashboard";
import { recordCoachAccount } from "./coach-libraries";
import { CoachMeetingRoom } from "./coach-meeting-room";
import { CoachSettingsPage } from "./coach-settings-page";
import { ExerciseEditorPage } from "./exercise-editor-page";
import { ExerciseLibraryPage } from "./exercise-library-page";
import { ExerciseRequests } from "./exercise-requests";
import { ExerciseVideoSamples } from "./exercise-video-files";
import { FoodEditorPage } from "./food-editor-page";
import { FoodRecords } from "./food-records";
import { FoodRequests } from "./food-requests";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  insertMeasuredClientRecords,
  type MeasuredClientSeed,
} from "./measured-clients";
import { MeasurementRecords } from "./measurement-records";
import { MeasurementsSheet } from "./measurements-sheet";
import { NotificationBell } from "./notification-bell";
import { NotificationRecords } from "./notification-records";
import { NutritionLibraryPage } from "./nutrition-library-page";
import { OnboardingRecords } from "./onboarding-records";
import { PaymentCardRecords } from "./payment-card-records";
import { PhotoRequests } from "./photo-requests";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoView } from "./photo-view";
import { PortalRequests } from "./portal-requests";
import { PrivacyPolicyPage } from "./privacy-policy-page";
import { RecipeBuilderPage } from "./recipe-builder-page";
import { RecipeRequests } from "./recipe-requests";
import { ResourceDetailsDialog } from "./resource-details-dialog";
import { ResourceRequests } from "./resource-requests";
import { ResourceToolbar } from "./resource-toolbar";
import { ResourceViewer } from "./resource-viewer";
import { WeeklyCheckInDialog } from "./weekly-check-in-dialog";
import {
  insertInvitedClientRecords,
  insertPaidClientRecords,
  type InvitationStanding,
  type InvitedClient,
  type PaidClient,
  type PaidClientIdentity,
  type StartChoice,
  type InvitationSeed,
} from "./paid-clients";
import {
  insertClientInState,
  insertProfiledClientRecords,
  isInvitedState,
  insertReviewedClientRecords,
  type ClientState,
  type SubmissionProfile,
  type ReviewState,
  type SubmittedClient,
} from "./submitted-clients";
import { releaseClerkAccounts } from "./clerk-accounts";
import { summarizeRevocations } from "./clerk-invitations";
import {
  recordCreatedEmail,
  recordReleasedEmails,
  summarizeDeletionResults,
} from "./clerk-users";
import { createE2eDatabasePool } from "./database";
import { requireEnv } from "./env";
import { PublicNav } from "./public-nav";
import { resolveRunId, runEmailPrefix } from "./run-id";
import { StripeBillingPortalPage } from "./stripe-billing-portal-page";
import { StripeCheckoutPage } from "./stripe-checkout";
import {
  cleanUpRecordedStripeObjects,
  registerCheckoutSessionForCleanup,
} from "./stripe-cleanup";
import {
  insertSubscribedClientRecords,
  type SubscribedClient,
  type SubscribedClientSeed,
} from "./subscribed-clients";

type PlatformFixtures = {
  siteOutOfWaitlistMode: void;
  publicNav: PublicNav;
  clientPortalShell: ClientPortalShell;
  clientOnboarding: ClientOnboarding;
  clientDashboard: ClientDashboard;
  clientProfile: ClientProfilePage;
  clientSettings: ClientSettingsPage;
  clientEnded: ClientEndedPage;
  clientResources: ClientResourcesPage;
  clientCheckIns: ClientCheckInsPage;
  checkInRequestDialog: CheckInPickerDialog;
  checkInScheduleDialog: CheckInPickerDialog;
  checkInProposeDialog: CheckInPickerDialog;
  cancelCheckInDialog: ConfirmationDialog;
  weeklyCheckInDialog: WeeklyCheckInDialog;
  stopWeeklyDialog: ConfirmationDialog;
  privacyPolicy: PrivacyPolicyPage;
  measurementsSheet: MeasurementsSheet;
  photoView: PhotoView;
  photoLightbox: PhotoLightbox;
  accountPortal: AccountPortal;
  mintTestEmail: () => string;
  testEmail: string;
  visitorEmail: string;
  stripeCheckout: StripeCheckoutPage;
  stripeBillingPortal: StripeBillingPortalPage;
  registerCheckoutSessionForCleanup: (sessionId: string) => void;
  bookingPage: BookingPage;
  coachAssessmentCalls: CoachAssessmentCallsPage;
  coachClients: CoachClientsPage;
  coachClient: CoachClientPage;
  coachClientProfile: CoachClientProfilePage;
  coachClientResources: CoachClientResourcesPage;
  coachCheckIns: CoachCheckInsPage;
  coachDashboard: CoachDashboardPage;
  coachMeetingRoom: CoachMeetingRoom;
  coachAvailability: CoachAvailability;
  checkInRecords: CheckInRecords;
  checkInRequests: CheckInRequests;
  notificationBell: NotificationBell;
  notificationRecords: NotificationRecords;
  coachSettings: CoachSettingsPage;
  exerciseLibrary: ExerciseLibraryPage;
  exerciseEditor: ExerciseEditorPage;
  exerciseRequests: ExerciseRequests;
  visitorExerciseRequests: ExerciseRequests;
  exerciseVideoSamples: ExerciseVideoSamples;
  nutritionLibrary: NutritionLibraryPage;
  foodEditor: FoodEditorPage;
  foodRequests: FoodRequests;
  foodRecords: FoodRecords;
  visitorFoodRequests: FoodRequests;
  recipeBuilder: RecipeBuilderPage;
  recipeRequests: RecipeRequests;
  visitorRecipeRequests: RecipeRequests;
  addResourceDialog: AddResourceDialog;
  resourceDetailsDialog: ResourceDetailsDialog;
  resourceViewer: ResourceViewer;
  resourceToolbar: ResourceToolbar;
  clientResourcesOutage: ClientResourcesOutage;
  coachEmail: string;
  scenarioTag: string;
  createClerkUser: () => Promise<string>;
  // Inserts the accounts row directly because no entry point creates one yet.
  // Once the coach's invitation flow lands, arrange through it instead: sign
  // in as the bootstrap coach, invite testEmail, accept the invitation. That
  // removes databasePool and this INSERT from the suite.
  provisionAccount: (role: AccountRole) => Promise<void>;
  provisionPaidClient: (
    gender: VisitorGender,
    options?: PaidClientOptions,
  ) => Promise<PaidClient>;
  provisionInvitedClient: (
    standing: InvitationStanding,
  ) => Promise<InvitedClient>;
  provisionSubmittedClient: (
    start: StartChoice,
    state?: ReviewState,
  ) => Promise<SubmittedClient>;
  provisionSubscribedClient: (
    seed: SubscribedClientSeed,
  ) => Promise<SubscribedClient>;
  provisionClientInState: (state: ClientState) => Promise<PaidClient>;
  provisionProfiledClient: (
    profile: SubmissionProfile,
  ) => Promise<SubmittedClient>;
  otherClientEmail: string;
  provisionMeasuredClient: (
    seed: MeasuredClientSeed,
  ) => Promise<SubmittedClient>;
  provisionOtherMeasuredClient: (
    seed: MeasuredClientSeed,
  ) => Promise<SubmittedClient>;
  measurementRecords: MeasurementRecords;
  photoRequests: PhotoRequests;
  visitorPhotoRequests: PhotoRequests;
  resourceRequests: ResourceRequests;
  visitorResourceRequests: ResourceRequests;
  portalRequests: PortalRequests;
  provisionCoach: () => Promise<void>;
  onboardingRecords: OnboardingRecords;
  paymentCardRecords: PaymentCardRecords;
  signIn: () => Promise<void>;
  signInAsCoach: () => Promise<void>;
  signInAsOtherClient: () => Promise<void>;
};

// Shared per worker process: both are cheap to reuse across a worker's tests.
type WorkerFixtures = {
  clerkBackendClient: ClerkClient;
  databasePool: pg.Pool;
};

// Unique per test, not per email-lookup, so a rerun with the same worker
// process never collides with a previous run's Clerk users or accounts rows
// — the whole point of the +clerk_test convention being namespaced this way.
// Resolved (not generated) here: global-setup.ts already generated this
// run's id and published it via run-id.ts's environment variable before this
// worker process started, so every email this worker mints and every email
// global-teardown.ts later reads back agree on the same run.
const RUN_ID = resolveRunId();
const INSERT_ACCOUNT =
  "INSERT INTO app.accounts (id, auth_subject_id, role) VALUES (gen_random_uuid(), $1, $2)";
const PAID_CLIENT_FIRST_NAME = "Ana";
const PAID_CLIENT_LAST_NAME = `Onboarding ${RUN_ID}`;
const ADULT_DATE_OF_BIRTH = "1994-03-14";
const INVITED_CLIENT_FIRST_NAME = "Bianca";
const INVITED_CLIENT_SURNAME: Record<InvitationStanding, string> = {
  pending: "Pending",
  expired: "Expired",
  "email-failed": "Unsent",
};
const CLIENT_FIRST_NAME_BY_STATE: Record<ClientState, string> = {
  "invited-pending": "Bianca",
  "invited-expired": "Bianca",
  "invited-email-failed": "Bianca",
  onboarding: "Carla",
  "awaiting-review": "Dana",
  "in-review": "Elena",
  "needs-details": "Flavia",
  approved: "Gina",
};
const MEASURED_CLIENT_FIRST_NAME = "Ana";
const OTHER_MEASURED_CLIENT_FIRST_NAME = "Bianca";
const PROFILED_CLIENT_FIRST_NAME: Record<SubmissionProfile, string> = {
  flagged: "Irina",
  "manual-screening": "Mihai",
};

type PaidClientOptions = { dateOfBirth: string };

type MeasuredClientAccount = {
  authSubjectId: string;
  email: string;
  firstName: string;
};
let sequence = 0;

function mintRecordedTestEmail(workerIndex: number): string {
  sequence += 1;
  // Clerk treats any address carrying a `+clerk_test` subaddress as a test
  // email that accepts the fixed OTP code instead of sending a real one —
  // https://clerk.com/docs/guides/development/testing/test-emails-and-phones
  // documents it as `local+clerk_test@domain`. The run/sequence marker sits
  // *before* that subaddress so `+clerk_test` stays the exact tag Clerk
  // documents, rather than risking a second `+` segment its matcher may not
  // recognize.
  // The worker index keeps a restarted worker, whose sequence starts over,
  // from minting an address an earlier worker of the same run already used.
  const email = `${runEmailPrefix(RUN_ID)}${workerIndex}-${sequence}+clerk_test@evoa.fit`;
  // Recorded before any test does anything with it, so a run-scoped cleanup
  // registry exists even for the failure paths that never reach
  // createClerkUser (see clerk-users.ts and global-teardown.ts).
  recordCreatedEmail(email, RUN_ID);

  return email;
}

function requireProviderUrl(invitation: { id: string; url?: string }): string {
  if (!invitation.url) {
    throw new Error(`Clerk invitation ${invitation.id} carries no URL.`);
  }

  return invitation.url;
}

function measuredClientIdentity(
  account: MeasuredClientAccount,
  scenarioTag: string,
): PaidClientIdentity {
  return {
    ...account,
    lastName: `Measurements ${scenarioTag}`,
    gender: "female",
    dateOfBirth: ADULT_DATE_OF_BIRTH,
  };
}

async function createProviderInvitation(
  clerkBackendClient: ClerkClient,
  email: string,
): Promise<Omit<InvitationSeed, "standing">> {
  const id = randomUUID();
  const provider = await clerkBackendClient.invitations.createInvitation({
    emailAddress: email,
    ignoreExisting: true,
    notify: false,
    publicMetadata: { invitationId: id },
  });

  return {
    id,
    provider: { id: provider.id, url: requireProviderUrl(provider) },
  };
}

export const test = base.extend<PlatformFixtures, WorkerFixtures>({
  clerkBackendClient: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(
        createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") }),
      );
    },
    { scope: "worker" },
  ],

  databasePool: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const pool = createE2eDatabasePool();

      await use(pool);
      await pool.end();
    },
    { scope: "worker" },
  ],

  // Overrides the built-in `page` fixture so every test gets the bot-
  // protection bypass before it ever navigates — this Clerk instance has
  // captcha on, and this token is its documented bypass for automated
  // browsers. Every other fixture below that depends on `page` receives
  // this same instance, so nothing has to remember to call it per spec.
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page });
    await use(page);
  },

  // Applies the URL override before the journey's own first page.goto, so the
  // server's session cookie already carries it for every navigation after.
  siteOutOfWaitlistMode: [
    async ({ page }, use) => {
      await page.goto("/?ff.WAITLIST_MODE=false");
      await use();
    },
    { auto: true },
  ],

  publicNav: async ({ page }, use) => {
    await use(new PublicNav(page));
  },

  clientPortalShell: async ({ page }, use) => {
    await use(new ClientPortalShell(page));
  },

  clientOnboarding: async ({ page }, use) => {
    await use(new ClientOnboarding(page));
  },

  clientDashboard: async ({ page }, use) => {
    await use(new ClientDashboard(page));
  },

  clientProfile: async ({ page }, use) => {
    await use(new ClientProfilePage(page));
  },

  privacyPolicy: async ({ page }, use) => {
    await use(new PrivacyPolicyPage(page));
  },

  clientSettings: async ({ page }, use) => {
    await use(new ClientSettingsPage(page));
  },

  clientEnded: async ({ page }, use) => {
    await use(new ClientEndedPage(page));
  },

  clientResources: async ({ page }, use) => {
    await use(new ClientResourcesPage(page));
  },

  clientCheckIns: async ({ page }, use) => {
    await use(new ClientCheckInsPage(page));
  },

  checkInRequestDialog: async ({ page }, use) => {
    await use(new CheckInPickerDialog(page, CHECK_IN_REQUEST_PICKER));
  },

  checkInScheduleDialog: async ({ page }, use) => {
    await use(new CheckInPickerDialog(page, CHECK_IN_SCHEDULE_PICKER));
  },

  checkInProposeDialog: async ({ page }, use) => {
    await use(new CheckInPickerDialog(page, CHECK_IN_PROPOSE_PICKER));
  },

  cancelCheckInDialog: async ({ page }, use) => {
    await use(new ConfirmationDialog(page, CANCEL_CHECK_IN_LABELS));
  },

  weeklyCheckInDialog: async ({ page }, use) => {
    await use(new WeeklyCheckInDialog(page));
  },

  stopWeeklyDialog: async ({ page }, use) => {
    await use(new ConfirmationDialog(page, STOP_WEEKLY_CHECK_IN_LABELS));
  },

  measurementsSheet: async ({ page }, use) => {
    await use(new MeasurementsSheet(page));
  },

  photoView: async ({ page }, use) => {
    await use(new PhotoView(page));
  },

  photoLightbox: async ({ page }, use) => {
    await use(new PhotoLightbox(page));
  },

  accountPortal: async ({ page }, use) => {
    await use(new AccountPortal(page));
  },

  // Each test releases its Clerk users and invitations as it ends, so a full
  // run never holds more than one test's users against the 100-user cap.
  mintTestEmail: async ({ clerkBackendClient }, use, testInfo) => {
    const minted: string[] = [];

    await use(() => {
      const email = mintRecordedTestEmail(testInfo.workerIndex);
      minted.push(email);

      return email;
    });

    const release = await releaseClerkAccounts(clerkBackendClient, minted);

    if (!release.released) {
      console.log(
        `[e2e cleanup] Clerk after "${testInfo.title}": users ${summarizeDeletionResults(release.deletions)}; invitations ${summarizeRevocations(release.revocations)}`,
      );
      return;
    }

    recordReleasedEmails(minted, RUN_ID);
  },

  testEmail: async ({ mintTestEmail }, use) => {
    await use(mintTestEmail());
  },

  visitorEmail: async ({ mintTestEmail }, use) => {
    await use(mintTestEmail());
  },

  stripeCheckout: async ({ page }, use) => {
    await use(new StripeCheckoutPage(page));
  },

  stripeBillingPortal: async ({ page }, use) => {
    await use(new StripeBillingPortalPage(page));
  },

  // eslint-disable-next-line no-empty-pattern
  registerCheckoutSessionForCleanup: async ({}, use) => {
    await use((sessionId) =>
      registerCheckoutSessionForCleanup(sessionId, RUN_ID),
    );
    await cleanUpRecordedStripeObjects(RUN_ID, "[e2e cleanup]");
  },

  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },

  coachAssessmentCalls: async ({ page }, use) => {
    await use(new CoachAssessmentCallsPage(page));
  },

  coachClients: async ({ page }, use) => {
    await use(new CoachClientsPage(page));
  },

  coachClient: async ({ page }, use) => {
    await use(new CoachClientPage(page));
  },

  coachClientProfile: async ({ page }, use) => {
    await use(new CoachClientProfilePage(page));
  },

  coachClientResources: async ({ page }, use) => {
    await use(new CoachClientResourcesPage(page));
  },

  coachCheckIns: async ({ page }, use) => {
    await use(new CoachCheckInsPage(page));
  },

  coachDashboard: async ({ page }, use) => {
    await use(new CoachDashboardPage(page));
  },

  coachMeetingRoom: async ({ databasePool, page, scenarioTag }, use) => {
    const room = await CoachMeetingRoom.heldIn({
      page,
      pool: databasePool,
      scenarioTag,
    });

    await use(room);
    await room.restore();
  },

  coachAvailability: async ({ databasePool }, use) => {
    const availability = await CoachAvailability.heldIn(databasePool);

    await use(availability);
    await availability.restore();
  },

  checkInRecords: async ({ databasePool }, use) => {
    await use(new CheckInRecords(databasePool));
  },

  checkInRequests: async ({ page }, use) => {
    await use(new CheckInRequests(page));
  },

  notificationBell: async ({ page }, use) => {
    await use(new NotificationBell(page));
  },

  notificationRecords: async ({ databasePool }, use) => {
    await use(new NotificationRecords(databasePool));
  },

  coachSettings: async ({ page }, use) => {
    await use(new CoachSettingsPage(page));
  },

  exerciseLibrary: async ({ page }, use) => {
    await use(new ExerciseLibraryPage(page));
  },

  exerciseEditor: async ({ page }, use) => {
    await use(new ExerciseEditorPage(page));
  },

  exerciseRequests: async ({ page }, use) => {
    await use(new ExerciseRequests(page.request));
  },

  visitorExerciseRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new ExerciseRequests(visitor));
    await visitor.dispose();
  },

  // eslint-disable-next-line no-empty-pattern
  exerciseVideoSamples: async ({}, use) => {
    const samples = new ExerciseVideoSamples();

    await use(samples);
    samples.dispose();
  },

  nutritionLibrary: async ({ page }, use) => {
    await use(new NutritionLibraryPage(page));
  },

  foodEditor: async ({ page }, use) => {
    await use(new FoodEditorPage(page));
  },

  foodRequests: async ({ page }, use) => {
    await use(new FoodRequests(page.request));
  },

  foodRecords: async ({ databasePool }, use) => {
    await use(new FoodRecords(databasePool));
  },

  visitorFoodRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new FoodRequests(visitor));
    await visitor.dispose();
  },

  recipeBuilder: async ({ page }, use) => {
    await use(new RecipeBuilderPage(page));
  },

  recipeRequests: async ({ page }, use) => {
    await use(new RecipeRequests(page.request));
  },

  visitorRecipeRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new RecipeRequests(visitor));
    await visitor.dispose();
  },

  addResourceDialog: async ({ page }, use) => {
    await use(new AddResourceDialog(page));
  },

  resourceDetailsDialog: async ({ page }, use) => {
    await use(new ResourceDetailsDialog(page));
  },

  resourceViewer: async ({ page }, use) => {
    await use(new ResourceViewer(page));
  },

  resourceToolbar: async ({ page }, use) => {
    await use(new ResourceToolbar(page));
  },

  // eslint-disable-next-line no-empty-pattern
  clientResourcesOutage: async ({}, use) => {
    const outage = new ClientResourcesOutage();

    await use(outage);
    await outage.dispose();
  },

  coachEmail: async ({ mintTestEmail }, use) => {
    await use(mintTestEmail());
  },

  // eslint-disable-next-line no-empty-pattern
  scenarioTag: async ({}, use) => {
    await use(randomUUID().slice(0, 8));
  },

  createClerkUser: async ({ clerkBackendClient, testEmail }, use) => {
    await use(async () => {
      const user = await clerkBackendClient.users.createUser({
        emailAddress: [testEmail],
      });

      return user.id;
    });
  },

  provisionAccount: async ({ createClerkUser, databasePool }, use) => {
    await use(async (role: AccountRole) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, role]);

      if (role === "COACH") {
        recordCoachAccount(authSubjectId, RUN_ID);
      }
    });
  },

  provisionPaidClient: async (
    { createClerkUser, databasePool, testEmail },
    use,
  ) => {
    await use(
      async (
        gender: VisitorGender,
        options: PaidClientOptions = { dateOfBirth: ADULT_DATE_OF_BIRTH },
      ) => {
        const authSubjectId = await createClerkUser();

        await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

        return insertPaidClientRecords(databasePool, {
          authSubjectId,
          email: testEmail,
          firstName: PAID_CLIENT_FIRST_NAME,
          lastName: PAID_CLIENT_LAST_NAME,
          gender,
          dateOfBirth: options.dateOfBirth,
        });
      },
    );
  },

  provisionSubmittedClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(
      async (start: StartChoice, state: ReviewState = "awaiting-review") => {
        const authSubjectId = await createClerkUser();

        await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

        return insertReviewedClientRecords(
          databasePool,
          {
            identity: {
              authSubjectId,
              email: testEmail,
              firstName: PAID_CLIENT_FIRST_NAME,
              lastName: `Onboarding ${scenarioTag}`,
              gender: "female",
              dateOfBirth: ADULT_DATE_OF_BIRTH,
            },
            start,
          },
          state,
        );
      },
    );
  },

  provisionSubscribedClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(async (seed: SubscribedClientSeed) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

      return insertSubscribedClientRecords(
        databasePool,
        {
          authSubjectId,
          email: testEmail,
          firstName: PAID_CLIENT_FIRST_NAME,
          lastName: `Subscription ${scenarioTag}`,
          gender: "female",
          dateOfBirth: ADULT_DATE_OF_BIRTH,
        },
        { ...seed, runId: RUN_ID },
      );
    });
    await cleanUpRecordedStripeObjects(RUN_ID, "[e2e cleanup]");
  },

  provisionClientInState: async (
    { clerkBackendClient, databasePool, mintTestEmail, scenarioTag },
    use,
  ) => {
    await use(async (state: ClientState) => {
      const email = mintTestEmail();
      const invitation = isInvitedState(state)
        ? await createProviderInvitation(clerkBackendClient, email)
        : undefined;

      return insertClientInState(
        databasePool,
        {
          identity: {
            authSubjectId: `user_e2e_${randomUUID()}`,
            email,
            firstName: CLIENT_FIRST_NAME_BY_STATE[state],
            lastName: `Roster ${scenarioTag}`,
            gender: "female",
            dateOfBirth: ADULT_DATE_OF_BIRTH,
          },
          start: "waiting",
          invitation,
        },
        state,
      );
    });
  },

  provisionProfiledClient: async (
    { databasePool, mintTestEmail, scenarioTag },
    use,
  ) => {
    await use(async (profile: SubmissionProfile) =>
      insertProfiledClientRecords(
        databasePool,
        {
          authSubjectId: `user_e2e_${randomUUID()}`,
          email: mintTestEmail(),
          firstName: PROFILED_CLIENT_FIRST_NAME[profile],
          lastName: `Profile ${scenarioTag}`,
        },
        profile,
      ),
    );
  },

  portalRequests: async ({ page }, use) => {
    await use(new PortalRequests(page));
  },

  otherClientEmail: async ({ mintTestEmail }, use) => {
    await use(mintTestEmail());
  },

  provisionMeasuredClient: async (
    { createClerkUser, databasePool, scenarioTag, testEmail },
    use,
  ) => {
    await use(async (seed: MeasuredClientSeed) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(INSERT_ACCOUNT, [authSubjectId, "CLIENT"]);

      return insertMeasuredClientRecords(
        databasePool,
        measuredClientIdentity(
          {
            authSubjectId,
            email: testEmail,
            firstName: MEASURED_CLIENT_FIRST_NAME,
          },
          scenarioTag,
        ),
        seed,
      );
    });
  },

  provisionOtherMeasuredClient: async (
    { clerkBackendClient, databasePool, otherClientEmail, scenarioTag },
    use,
  ) => {
    await use(async (seed: MeasuredClientSeed) => {
      const user = await clerkBackendClient.users.createUser({
        emailAddress: [otherClientEmail],
      });

      await databasePool.query(INSERT_ACCOUNT, [user.id, "CLIENT"]);

      return insertMeasuredClientRecords(
        databasePool,
        measuredClientIdentity(
          {
            authSubjectId: user.id,
            email: otherClientEmail,
            firstName: OTHER_MEASURED_CLIENT_FIRST_NAME,
          },
          scenarioTag,
        ),
        seed,
      );
    });
  },

  measurementRecords: async ({ databasePool }, use) => {
    await use(new MeasurementRecords(databasePool));
  },

  photoRequests: async ({ page }, use) => {
    await use(new PhotoRequests(page.request));
  },

  visitorPhotoRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new PhotoRequests(visitor));
    await visitor.dispose();
  },

  resourceRequests: async ({ page }, use) => {
    await use(new ResourceRequests(page.request));
  },

  visitorResourceRequests: async ({ baseURL, playwright }, use) => {
    const visitor = await playwright.request.newContext({ baseURL });

    await use(new ResourceRequests(visitor));
    await visitor.dispose();
  },

  provisionInvitedClient: async (
    { clerkBackendClient, databasePool, mintTestEmail, scenarioTag },
    use,
  ) => {
    await use(async (standing: InvitationStanding) => {
      const email = mintTestEmail();
      const invitation = await createProviderInvitation(
        clerkBackendClient,
        email,
      );

      return insertInvitedClientRecords(
        databasePool,
        {
          email,
          firstName: INVITED_CLIENT_FIRST_NAME,
          lastName: `${INVITED_CLIENT_SURNAME[standing]} ${scenarioTag}`,
          gender: "female",
          dateOfBirth: ADULT_DATE_OF_BIRTH,
        },
        { invitation: { ...invitation, standing } },
      );
    });
  },

  provisionCoach: async (
    { clerkBackendClient, coachEmail, databasePool },
    use,
  ) => {
    await use(async () => {
      const coach = await clerkBackendClient.users.createUser({
        emailAddress: [coachEmail],
      });

      await databasePool.query(INSERT_ACCOUNT, [coach.id, "COACH"]);
      recordCoachAccount(coach.id, RUN_ID);
    });
  },

  onboardingRecords: async ({ databasePool, testEmail }, use) => {
    await use(new OnboardingRecords(databasePool, testEmail));
  },

  paymentCardRecords: async ({ databasePool }, use) => {
    await use(new PaymentCardRecords(databasePool));
  },

  signIn: async ({ publicNav, accountPortal, testEmail }, use) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(testEmail);
      await accountPortal.completeEmailOtp();
    });
  },

  signInAsCoach: async ({ publicNav, accountPortal, coachEmail }, use) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(coachEmail);
      await accountPortal.completeEmailOtp();
    });
  },

  signInAsOtherClient: async (
    { publicNav, accountPortal, otherClientEmail },
    use,
  ) => {
    await use(async () => {
      await publicNav.openSignIn();
      await accountPortal.signInWithEmail(otherClientEmail);
      await accountPortal.completeEmailOtp();
    });
  },
});

export { expect };
