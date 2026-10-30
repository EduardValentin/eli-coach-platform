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
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type {
  AttachProgressPhotosUseCase,
  ProgressPhotoOutcomes,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ClockPort } from "~/bounded-contexts/clients/client-profile/domain/clock-port";
import type { UnitPreference } from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import {
  createBadRequestResponse,
  readFormDataRequestBody,
  readJsonRequestBody,
} from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";
import {
  answerDetailsRequestSchema,
  missingConsentSchema,
  onboardingPageSchema,
  openRequestSummarySchema,
  onboardingRefusalSchema,
  saveDraftRequestSchema,
  SUBMIT_ONBOARDING_FIELDS,
  submissionAcceptedSchema,
  submissionProblemsSchema,
  submissionSentSchema,
  submitRequestSchema,
  type AskedAnswers,
  type OnboardingConsentInstants,
  type OnboardingPage,
  type OpenRequestSummary,
  type QuestionId,
  type SubmitRequest,
} from "~/bounded-contexts/clients/client-profile/public/onboarding";
import {
  progressPhotoOutcomesOf,
  receivedProgressPhotosOf,
} from "~/bounded-contexts/clients/client-profile/public/progress-photo-parts";
import { accessContext } from "~/bounded-contexts/access/public/session";

type ClientOnboardingControllerOptions = {
  answerOnboardingDetailsUseCase: AnswerOnboardingDetailsUseCase;
  attachProgressPhotosUseCase: AttachProgressPhotosUseCase;
  clockPort: ClockPort;
  readClientOnboardingUseCase: ReadClientOnboardingUseCase;
  readOpenDetailRequestUseCase: ReadOpenDetailRequestUseCase;
  saveOnboardingDraftUseCase: SaveOnboardingDraftUseCase;
  submitOnboardingUseCase: SubmitOnboardingUseCase;
};

type OnboardingRefusal =
  "not-on-journey" | "ended" | "already-submitted" | "no-open-request";

type SubmittedOnboarding = Extract<
  Awaited<ReturnType<SubmitOnboardingUseCase["execute"]>>,
  { status: "submitted" }
>;

type OpenDetailRequest = NonNullable<
  Awaited<ReturnType<ReadOpenDetailRequestUseCase["execute"]>>
>;

type OnboardingReading = {
  onboarding: ClientOnboarding;
  unitPreference: UnitPreference;
};

const ONBOARDING_REQUEST_MAX_BYTES = 64 * 1024;

const SUBMISSION_REQUEST_MAX_BYTES = 32 * 1024 * 1024;

const REFUSAL_STATUS = {
  "not-on-journey": 404,
  ended: 409,
  "already-submitted": 409,
  "no-open-request": 409,
} as const satisfies Record<OnboardingRefusal, number>;

export class ClientOnboardingController {
  constructor(private readonly options: ClientOnboardingControllerOptions) {}

  async loadOnboarding(args: LoaderFunctionArgs): Promise<OnboardingPage> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const [reading, openRequest] = await Promise.all([
      this.options.readClientOnboardingUseCase.execute(client.authSubjectId),
      this.options.readOpenDetailRequestUseCase.execute(client.authSubjectId),
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
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");
    const openRequest = await this.options.readOpenDetailRequestUseCase.execute(
      client.authSubjectId,
    );

    return openRequestSummarySchema.parse(
      openRequest ? { note: openRequest.note } : null,
    );
  }

  async saveDraft(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const request = saveDraftRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: ONBOARDING_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse(
        "The onboarding draft could not be read.",
      );
    }

    const result = await this.options.saveOnboardingDraftUseCase.execute({
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
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const body = await readFormDataRequestBody(args.request, {
      maxBytes: SUBMISSION_REQUEST_MAX_BYTES,
    });

    if (body.status === "too_large") {
      return Response.json(
        { message: "The answers and photos are too large to send." },
        { status: 413 },
      );
    }

    if (body.status === "invalid") {
      return unreadableSubmissionResponse();
    }

    const request = submissionOf(body.formData);

    if (!request) {
      return unreadableSubmissionResponse();
    }

    const result = await this.options.submitOnboardingUseCase.execute({
      authSubjectId: client.authSubjectId,
      answers: request.answers,
      consents: consentsOf(request.consents),
    });

    switch (result.status) {
      case "submitted":
        return submissionSentResponse(
          await this.attachedPhotoOutcomes(result, body.formData),
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

  async answerDetails(args: ActionFunctionArgs): Promise<Response> {
    const client = args.context
      .get(accessContext)
      .requireAccount({ role: "CLIENT" });
    const request = answerDetailsRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: ONBOARDING_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The answers could not be read.");
    }

    const result = await this.options.answerOnboardingDetailsUseCase.execute({
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

  private async attachedPhotoOutcomes(
    submitted: SubmittedOnboarding,
    formData: FormData,
  ): Promise<ProgressPhotoOutcomes> {
    const photos = await receivedProgressPhotosOf(formData);

    if (photos.length === 0) {
      return {};
    }

    return this.options.attachProgressPhotosUseCase.execute({
      clientId: submitted.clientId,
      entryId: submitted.entryId,
      photos,
    });
  }

  private wizardPageOf({ onboarding, unitPreference }: OnboardingReading) {
    const now = this.options.clockPort.now();
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

function unreadableSubmissionResponse(): Response {
  return createBadRequestResponse("The onboarding answers could not be read.");
}

function submissionOf(formData: FormData): SubmitRequest | null {
  const submission = formData.get(SUBMIT_ONBOARDING_FIELDS.submission);

  if (typeof submission !== "string") {
    return null;
  }

  try {
    const parsed = submitRequestSchema.safeParse(JSON.parse(submission));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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

function submissionSentResponse(outcomes: ProgressPhotoOutcomes): Response {
  return Response.json(
    submissionSentSchema.parse({
      redirectTo: CLIENT_PORTAL_PATH,
      photos: progressPhotoOutcomesOf(outcomes),
    }),
  );
}
