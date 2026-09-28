import {
  emptyDraft,
  type OnboardingAnswersByForm,
  type OnboardingConsents,
  type ReadClientOnboardingUseCase,
  type SaveOnboardingDraftUseCase,
  type SubmitOnboardingUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { SaveUnitPreferenceUseCase } from "@eli-coach-platform/domain/unit-preference";
import {
  createBadRequestResponse,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  missingConsentSchema,
  onboardingPageSchema,
  onboardingRefusalSchema,
  saveDraftRequestSchema,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  submitRequestSchema,
  unitPreferenceRequestSchema,
  type OnboardingConsentInstants,
  type OnboardingPage,
} from "~/features/client-onboarding/contracts/onboarding";

type ClientOnboardingControllerOptions = {
  clock: Clock;
  readClientOnboarding: ReadClientOnboardingUseCase;
  saveOnboardingDraft: SaveOnboardingDraftUseCase;
  saveUnitPreference: SaveUnitPreferenceUseCase;
  submitOnboarding: SubmitOnboardingUseCase;
};

type OnboardingRefusal = "not-on-journey" | "already-submitted";

const ONBOARDING_REQUEST_MAX_BYTES = 64 * 1024;
const UNIT_PREFERENCE_REQUEST_MAX_BYTES = 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  "already-submitted": 409,
} as const satisfies Record<OnboardingRefusal, number>;

export class ClientOnboardingController {
  constructor(private readonly options: ClientOnboardingControllerOptions) {}

  async loadOnboarding(args: LoaderFunctionArgs): Promise<OnboardingPage> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const reading = await this.options.readClientOnboarding.execute(
      client.authSubjectId,
    );

    if (!reading) {
      throw new Response("Not Found", { status: 404 });
    }

    const { onboarding, unitPreference } = reading;
    const now = this.options.clock.now();
    const draft = onboarding.draft ?? emptyDraft(now);

    return onboardingPageSchema.parse({
      clientId: onboarding.clientId,
      formIds: onboarding.forms().map((form) => form.id),
      gender: onboarding.gender,
      manualScreening: onboarding.manualScreeningOn(now),
      draft: {
        answers: draft.answers,
        currentFormIndex: draft.currentFormIndex,
        consents: consentInstantsOf(draft.consents),
        updatedAt: draft.updatedAt.toISOString(),
      },
      unitPreference,
      resumed: hasAnyAnswer(draft.answers),
    });
  }

  async saveDraft(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = saveDraftRequestSchema.safeParse(
      await readJsonRequestBody(args.request, ONBOARDING_REQUEST_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse(
        "The onboarding draft could not be read.",
      );
    }

    const result = await this.options.saveOnboardingDraft.execute({
      authSubjectId: client.authSubjectId,
      formId: request.data.formId,
      answers: request.data.answers,
      currentFormIndex: request.data.currentFormIndex,
      consents: consentsOf(request.data.consents),
    });

    if (result.status === "saved") {
      return noContentResponse();
    }

    return refusalResponse(result.status);
  }

  async submit(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = submitRequestSchema.safeParse(
      await readJsonRequestBody(args.request, ONBOARDING_REQUEST_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse(
        "The onboarding answers could not be read.",
      );
    }

    const result = await this.options.submitOnboarding.execute({
      authSubjectId: client.authSubjectId,
      answers: request.data.answers,
      consents: consentsOf(request.data.consents),
    });

    switch (result.status) {
      case "submitted":
        return Response.json(
          submissionAcceptedSchema.parse({ redirectTo: CLIENT_PORTAL_PATH }),
        );
      case "invalid":
        return Response.json(
          submissionProblemsSchema.parse({ problems: result.problems }),
          { status: 422 },
        );
      case "consent-missing":
        return Response.json(
          missingConsentSchema.parse({ consent: result.consent }),
          { status: 422 },
        );
      default:
        return refusalResponse(result.status);
    }
  }

  async saveUnitPreference(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = unitPreferenceRequestSchema.safeParse(
      await readJsonRequestBody(
        args.request,
        UNIT_PREFERENCE_REQUEST_MAX_BYTES,
      ),
    );

    if (!request.success) {
      return createBadRequestResponse("The units could not be read.");
    }

    const result = await this.options.saveUnitPreference.execute({
      authSubjectId: client.authSubjectId,
      preference: request.data,
    });

    if (result.status === "saved") {
      return noContentResponse();
    }

    return refusalResponse(result.status);
  }
}

async function readJsonRequestBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const body = await readTextRequestBody(request, { maxBytes });

  if (body.status !== "valid") {
    return undefined;
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}

function hasAnyAnswer(answers: OnboardingAnswersByForm): boolean {
  return Object.values(answers).some((formAnswers) =>
    Object.values(formAnswers).some(
      (answer) =>
        answer !== null &&
        answer !== "" &&
        !(Array.isArray(answer) && answer.length === 0),
    ),
  );
}

function consentInstantsOf(
  consents: OnboardingConsents,
): OnboardingConsentInstants {
  return {
    specialCategoryAt: consents.specialCategoryAt?.toISOString() ?? null,
    disclaimerAt: consents.disclaimerAt?.toISOString() ?? null,
    progressPhotosAt: consents.progressPhotosAt?.toISOString() ?? null,
  };
}

function consentsOf(instants: OnboardingConsentInstants): OnboardingConsents {
  return {
    specialCategoryAt: dateOrNull(instants.specialCategoryAt),
    disclaimerAt: dateOrNull(instants.disclaimerAt),
    progressPhotosAt: dateOrNull(instants.progressPhotosAt),
  };
}

function dateOrNull(instant: string | null): Date | null {
  return instant === null ? null : new Date(instant);
}

function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

function refusalResponse(refusal: OnboardingRefusal): Response {
  return Response.json(onboardingRefusalSchema.parse({ error: refusal }), {
    status: REFUSAL_STATUS[refusal],
  });
}
