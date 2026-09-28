import {
  emptyDraft,
  hasStartedAnswering,
  type AnswerOnboardingDetailsUseCase,
  type ClientOnboarding,
  type OnboardingConsents,
  type ReadClientOnboardingUseCase,
  type ReadOpenDetailRequestUseCase,
  type SaveOnboardingDraftUseCase,
  type SubmitOnboardingUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type {
  SaveUnitPreferenceUseCase,
  UnitPreference,
} from "@eli-coach-platform/domain/unit-preference";
import { createBadRequestResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import { readJsonRequestBody } from "~/features/client-onboarding/api/read-json-request-body.server";
import {
  answerDetailsRequestSchema,
  missingConsentSchema,
  onboardingPageSchema,
  openRequestSummarySchema,
  onboardingRefusalSchema,
  saveDraftRequestSchema,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  submitRequestSchema,
  unitPreferenceSchema,
  type AskedAnswers,
  type OnboardingConsentInstants,
  type OnboardingPage,
  type OpenRequestSummary,
  type QuestionId,
} from "~/features/client-onboarding/contracts/onboarding";

type ClientOnboardingControllerOptions = {
  answerOnboardingDetails: AnswerOnboardingDetailsUseCase;
  clock: Clock;
  readClientOnboarding: ReadClientOnboardingUseCase;
  readOpenDetailRequest: ReadOpenDetailRequestUseCase;
  saveOnboardingDraft: SaveOnboardingDraftUseCase;
  saveUnitPreference: SaveUnitPreferenceUseCase;
  submitOnboarding: SubmitOnboardingUseCase;
};

type OnboardingRefusal =
  "not-on-journey" | "already-submitted" | "no-open-request";

type OpenDetailRequest = NonNullable<
  Awaited<ReturnType<ReadOpenDetailRequestUseCase["execute"]>>
>;

type OnboardingReading = {
  onboarding: ClientOnboarding;
  unitPreference: UnitPreference;
};

const ONBOARDING_REQUEST_MAX_BYTES = 64 * 1024;
const UNIT_PREFERENCE_REQUEST_MAX_BYTES = 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  "already-submitted": 409,
  "no-open-request": 409,
} as const satisfies Record<OnboardingRefusal, number>;

export class ClientOnboardingController {
  constructor(private readonly options: ClientOnboardingControllerOptions) {}

  async loadOnboarding(args: LoaderFunctionArgs): Promise<OnboardingPage> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const [reading, openRequest] = await Promise.all([
      this.options.readClientOnboarding.execute(client.authSubjectId),
      this.options.readOpenDetailRequest.execute(client.authSubjectId),
    ]);

    if (!reading) {
      throw new Response("Not Found", { status: 404 });
    }

    return onboardingPageSchema.parse(
      openRequest
        ? answerPageOf(reading, openRequest)
        : this.wizardPageOf(reading),
    );
  }

  async loadOpenRequest(args: LoaderFunctionArgs): Promise<OpenRequestSummary> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const openRequest = await this.options.readOpenDetailRequest.execute(
      client.authSubjectId,
    );

    return openRequestSummarySchema.parse(
      openRequest ? { note: openRequest.note } : null,
    );
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
    const request = unitPreferenceSchema.safeParse(
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
  async answerDetails(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const request = answerDetailsRequestSchema.safeParse(
      await readJsonRequestBody(args.request, ONBOARDING_REQUEST_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse("The answers could not be read.");
    }

    const result = await this.options.answerOnboardingDetails.execute({
      authSubjectId: client.authSubjectId,
      answers: request.data.answers,
    });

    switch (result.status) {
      case "answered":
        return Response.json(
          submissionAcceptedSchema.parse({ redirectTo: CLIENT_PORTAL_PATH }),
        );
      case "invalid":
        return Response.json(
          submissionProblemsSchema.parse({ problems: result.problems }),
          { status: 422 },
        );
      default:
        return refusalResponse(result.status);
    }
  }

  private wizardPageOf({ onboarding, unitPreference }: OnboardingReading) {
    const now = this.options.clock.now();
    const draft = onboarding.draft ?? emptyDraft(now);

    return {
      mode: "wizard",
      clientId: onboarding.clientId,
      formIds: onboarding.forms().map((form) => form.id),
      gender: onboarding.gender,
      manualScreening: onboarding.manualScreeningOn(now),
      draft: {
        answers: draft.answers,
        currentFormIndex: draft.currentFormIndex,
        consents: consentInstantsOf(draft.consents),
        updatedAt: onboarding.draft?.updatedAt.toISOString() ?? null,
      },
      unitPreference: unitPreference.toSnapshot(),
      resumed: hasStartedAnswering(draft.answers),
    };
  }
}

function answerPageOf(
  { onboarding, unitPreference }: OnboardingReading,
  openRequest: OpenDetailRequest,
) {
  return {
    mode: "answer",
    request: { note: openRequest.note, fields: [...openRequest.fields] },
    answers: askedAnswersOf(onboarding, openRequest.fields),
    unitPreference: unitPreference.toSnapshot(),
  };
}

function askedAnswersOf(
  onboarding: ClientOnboarding,
  fields: readonly QuestionId[],
): AskedAnswers {
  const submitted = onboarding.submission?.answers;
  const asked: AskedAnswers = {};

  for (const { formId, fieldId } of fields) {
    const answer = submitted?.[formId][fieldId];
    if (answer === undefined) continue;

    asked[formId] = { ...asked[formId], [fieldId]: answer };
  }

  return asked;
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
