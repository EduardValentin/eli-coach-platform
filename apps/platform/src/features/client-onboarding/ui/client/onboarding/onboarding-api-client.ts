import { joinBasePath } from "@eli-coach-platform/config";
import type { OnboardingConsent } from "@eli-coach-platform/domain/client-onboarding";
import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";

import {
  missingConsentSchema,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  type AnswerDetailsRequest,
  type SaveDraftRequest,
  type SubmissionProblem,
  type SubmitRequest,
} from "~/features/client-onboarding/contracts/onboarding";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/contracts/paths";

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
  CLIENT_PROFILE_API_PATHS.unitPreference,
);

const DETAIL_ANSWERS_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_ONBOARDING_API_PATHS.detailAnswers,
);

const NOT_ON_JOURNEY_STATUS = 404;
const ALREADY_SUBMITTED_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;

const REFUSED_STATUSES: readonly number[] = [
  NOT_ON_JOURNEY_STATUS,
  ALREADY_SUBMITTED_STATUS,
];

export type SaveOutcome = "saved" | "refused" | "failed";

type Accepted = { kind: "accepted"; redirectTo: string };

type Invalid = { kind: "invalid"; problems: SubmissionProblem[] };

type Failed = { kind: "failed" };

export type SubmissionOutcome =
  | Accepted
  | Invalid
  | { kind: "consent-missing"; consent: OnboardingConsent }
  | { kind: "already-submitted" }
  | Failed;

export type AnswerDetailsOutcome = Accepted | Invalid | Failed;

const REQUEST_FAILED: Failed = { kind: "failed" };

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

function saveOutcomeOf(response: Response | null): SaveOutcome {
  if (!response) return "failed";
  if (response.ok) return "saved";

  return REFUSED_STATUSES.includes(response.status) ? "refused" : "failed";
}

export async function saveDraft(
  request: SaveDraftRequest,
): Promise<SaveOutcome> {
  return saveOutcomeOf(
    await sendJson(DRAFT_API_URL, { body: request, method: "PUT" }),
  );
}

export async function saveUnitPreference(
  preference: UnitPreferenceSnapshot,
): Promise<SaveOutcome> {
  return saveOutcomeOf(
    await sendJson(UNIT_PREFERENCE_API_URL, {
      body: preference,
      method: "PUT",
    }),
  );
}

function acceptedOutcome(body: unknown): Accepted | Failed {
  const accepted = submissionAcceptedSchema.safeParse(body);

  return accepted.success
    ? { kind: "accepted", redirectTo: accepted.data.redirectTo }
    : REQUEST_FAILED;
}

function problemsOutcome(body: unknown): Invalid | Failed {
  const problems = submissionProblemsSchema.safeParse(body);

  return problems.success
    ? { kind: "invalid", problems: problems.data.problems }
    : REQUEST_FAILED;
}

function unprocessableSubmissionOutcome(body: unknown): SubmissionOutcome {
  const problems = problemsOutcome(body);

  if (problems.kind === "invalid") return problems;

  const missingConsent = missingConsentSchema.safeParse(body);

  return missingConsent.success
    ? { kind: "consent-missing", consent: missingConsent.data.consent }
    : REQUEST_FAILED;
}

export async function submitOnboarding(
  request: SubmitRequest,
): Promise<SubmissionOutcome> {
  const response = await sendJson(SUBMISSION_API_URL, {
    body: request,
    method: "POST",
  });

  if (!response) return REQUEST_FAILED;
  if (response.status === ALREADY_SUBMITTED_STATUS) {
    return { kind: "already-submitted" };
  }
  if (response.ok) return acceptedOutcome(await readJson(response));
  if (response.status === UNPROCESSABLE_STATUS) {
    return unprocessableSubmissionOutcome(await readJson(response));
  }

  return REQUEST_FAILED;
}

export async function answerDetails(
  request: AnswerDetailsRequest,
): Promise<AnswerDetailsOutcome> {
  const response = await sendJson(DETAIL_ANSWERS_API_URL, {
    body: request,
    method: "POST",
  });

  if (!response) return REQUEST_FAILED;
  if (response.ok) return acceptedOutcome(await readJson(response));
  if (response.status === UNPROCESSABLE_STATUS) {
    return problemsOutcome(await readJson(response));
  }

  return REQUEST_FAILED;
}
