import type {
  ApproveOnboardingAnswersUseCase,
  OpenOnboardingReviewUseCase,
  ReadOnboardingReviewUseCase,
  RequestOnboardingDetailsUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import { createBadRequestResponse } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientIdSchema,
  detailRequestSchema,
  onboardingReviewSchema,
  reviewActionAcceptedSchema,
  reviewActionRefusalSchema,
  reviewTargetSchema,
  type OnboardingReviewView,
  type ReviewActionRefusal,
} from "~/features/client-onboarding/contracts/onboarding-review";

import { readJsonRequestBody } from "~/features/client-onboarding/api/read-json-request-body.server";
import { presentSubmittedReview } from "./onboarding-review-presenter.server";

type OnboardingReviewControllerOptions = {
  approveOnboardingAnswers: ApproveOnboardingAnswersUseCase;
  openOnboardingReview: OpenOnboardingReviewUseCase;
  readOnboardingReview: ReadOnboardingReviewUseCase;
  requestOnboardingDetails: RequestOnboardingDetailsUseCase;
};

type ReviewActionOutcome = "opened" | "already-open" | "requested" | "approved";

const REVIEW_ACTION_MAX_BYTES = 16 * 1024;

const REFUSAL_STATUS = {
  "not-found": 404,
  "coaching-closed": 409,
  "not-submitted": 409,
  approved: 409,
  "not-in-review": 409,
  "not-reviewable": 409,
  invalid: 422,
} as const satisfies Record<ReviewActionRefusal, number>;

const UNREADABLE_REQUEST = "The review request could not be read.";

export class OnboardingReviewController {
  constructor(private readonly options: OnboardingReviewControllerOptions) {}

  async loadReview(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<OnboardingReviewView> {
    requirePortalAccess(args, { role: "COACH" });
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw notFoundResponse();
    }

    const reading = await this.options.readOnboardingReview.execute(
      target.data,
    );

    if (reading.status === "not-found") {
      throw notFoundResponse();
    }

    if (reading.status === "not-submitted") {
      return onboardingReviewSchema.parse({
        clientId: target.data,
        submitted: null,
        submittedWaistCm: null,
        statedHeightCm: null,
      });
    }

    return onboardingReviewSchema.parse({
      clientId: target.data,
      submitted: presentSubmittedReview(reading),
      submittedWaistCm: reading.submittedMeasurement?.waistCm ?? null,
      statedHeightCm: reading.statedHeightCm,
    });
  }

  async openReview(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const request = reviewTargetSchema.safeParse(
      await readJsonRequestBody(args.request, REVIEW_ACTION_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse(UNREADABLE_REQUEST);
    }

    const result = await this.options.openOnboardingReview.execute(
      request.data.clientId,
    );

    return result.status === "opened" || result.status === "already-open"
      ? acceptedResponse(result.status)
      : refusalResponse(result.status);
  }

  async requestDetails(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const request = detailRequestSchema.safeParse(
      await readJsonRequestBody(args.request, REVIEW_ACTION_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse(UNREADABLE_REQUEST);
    }

    const result = await this.options.requestOnboardingDetails.execute({
      clientId: request.data.clientId,
      questionIds: request.data.questions,
      note: request.data.note,
    });

    return result.status === "requested"
      ? acceptedResponse(result.status)
      : refusalResponse(result.status);
  }

  async approveAnswers(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });
    const request = reviewTargetSchema.safeParse(
      await readJsonRequestBody(args.request, REVIEW_ACTION_MAX_BYTES),
    );

    if (!request.success) {
      return createBadRequestResponse(UNREADABLE_REQUEST);
    }

    const result = await this.options.approveOnboardingAnswers.execute(
      request.data.clientId,
    );

    return result.status === "approved"
      ? acceptedResponse(result.status)
      : refusalResponse(result.status);
  }
}

function acceptedResponse(outcome: ReviewActionOutcome): Response {
  return Response.json(reviewActionAcceptedSchema.parse({ outcome }));
}

function refusalResponse(refusal: ReviewActionRefusal): Response {
  return Response.json(reviewActionRefusalSchema.parse({ error: refusal }), {
    status: REFUSAL_STATUS[refusal],
  });
}

function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
