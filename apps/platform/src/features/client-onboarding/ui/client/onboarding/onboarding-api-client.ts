import { joinBasePath } from "@eli-coach-platform/config";
import type { OnboardingConsent } from "@eli-coach-platform/domain/client-onboarding";
import type { UnitPreference } from "@eli-coach-platform/domain/unit-preference";

import {
  missingConsentSchema,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  type SaveDraftRequest,
  type SubmissionProblem,
  type SubmitRequest,
} from "~/features/client-onboarding/contracts/onboarding";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";

const DRAFT_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_ONBOARDING_API_PATHS.draft,
);

const SUBMISSION_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_ONBOARDING_API_PATHS.submission,
);

const UNIT_PREFERENCE_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_ONBOARDING_API_PATHS.unitPreference,
);

const NOT_ON_JOURNEY_STATUS = 404;
const ALREADY_SUBMITTED_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;

const REFUSED_STATUSES: readonly number[] = [
  NOT_ON_JOURNEY_STATUS,
  ALREADY_SUBMITTED_STATUS,
];

export type DraftSaveOutcome = "saved" | "refused" | "failed";

export type SubmissionOutcome =
  | { kind: "accepted"; redirectTo: string }
  | { kind: "invalid"; problems: SubmissionProblem[] }
  | { kind: "consent-missing"; consent: OnboardingConsent }
  | { kind: "already-submitted" }
  | { kind: "failed" };

const SUBMISSION_FAILED: SubmissionOutcome = { kind: "failed" };

type JsonRequest = { method: "POST" | "PUT"; body: unknown };

async function sendJson(
  url: string,
  request: JsonRequest,
): Promise<Response | null> {
  try {
    return await fetch(url, {
      body: JSON.stringify(request.body),
      headers: { "Content-Type": "application/json" },
      method: request.method,
    });
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function saveDraft(
  request: SaveDraftRequest,
): Promise<DraftSaveOutcome> {
  const response = await sendJson(DRAFT_API_URL, {
    body: request,
    method: "PUT",
  });

  if (!response) return "failed";
  if (response.ok) return "saved";

  return REFUSED_STATUSES.includes(response.status) ? "refused" : "failed";
}

export async function saveUnitPreference(
  preference: UnitPreference,
): Promise<void> {
  await sendJson(UNIT_PREFERENCE_API_URL, { body: preference, method: "PUT" });
}

function acceptedOutcome(body: unknown): SubmissionOutcome {
  const accepted = submissionAcceptedSchema.safeParse(body);

  return accepted.success
    ? { kind: "accepted", redirectTo: accepted.data.redirectTo }
    : SUBMISSION_FAILED;
}

function refusedOutcome(body: unknown): SubmissionOutcome {
  const problems = submissionProblemsSchema.safeParse(body);

  if (problems.success) {
    return { kind: "invalid", problems: problems.data.problems };
  }

  const missingConsent = missingConsentSchema.safeParse(body);

  return missingConsent.success
    ? { kind: "consent-missing", consent: missingConsent.data.consent }
    : SUBMISSION_FAILED;
}

export async function submitOnboarding(
  request: SubmitRequest,
): Promise<SubmissionOutcome> {
  const response = await sendJson(SUBMISSION_API_URL, {
    body: request,
    method: "POST",
  });

  if (!response) return SUBMISSION_FAILED;
  if (response.status === ALREADY_SUBMITTED_STATUS) {
    return { kind: "already-submitted" };
  }
  if (response.ok) return acceptedOutcome(await readJson(response));
  if (response.status === UNPROCESSABLE_STATUS) {
    return refusedOutcome(await readJson(response));
  }

  return SUBMISSION_FAILED;
}
