import { joinBasePath } from "@eli-coach-platform/config";
import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";

import type { SaveDraftRequest } from "~/features/client-onboarding/contracts/onboarding";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/contracts/paths";

const DRAFT_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_ONBOARDING_API_PATHS.draft,
);

const UNIT_PREFERENCE_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  CLIENT_PROFILE_API_PATHS.unitPreference,
);

const NOT_ON_JOURNEY_STATUS = 404;
const ALREADY_SUBMITTED_STATUS = 409;

const REFUSED_STATUSES: readonly number[] = [
  NOT_ON_JOURNEY_STATUS,
  ALREADY_SUBMITTED_STATUS,
];

export type SaveOutcome = "saved" | "refused" | "failed";

async function putJson(url: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(url, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
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
  return saveOutcomeOf(await putJson(DRAFT_API_URL, request));
}

export async function saveUnitPreference(
  preference: UnitPreferenceSnapshot,
): Promise<SaveOutcome> {
  return saveOutcomeOf(await putJson(UNIT_PREFERENCE_API_URL, preference));
}
