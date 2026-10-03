import type { Page } from "@playwright/test";

import type { DetailRequestSeed } from "./submitted-clients";

type FormAnswers = Record<string, unknown>;

export type AnswersByForm = Record<string, FormAnswers>;

export type PortalAnswer = { status: number; body: unknown };

export type PortalRedirect = { status: number; location: string | null };

const REVIEW_OPENINGS_PATH = "/api/client-onboarding/review-openings";
const DETAIL_REQUESTS_PATH = "/api/client-onboarding/detail-requests";
const APPROVALS_PATH = "/api/client-onboarding/approvals";
const DETAIL_ANSWERS_PATH = "/api/client-onboarding/detail-answers";
const ONBOARDING_DRAFT_PATH = "/api/client-onboarding/draft";
const INVITATION_RESENDS_PATH = "/api/coaching-sales/invitation-resends";
const SUBSCRIPTION_CANCELLATION_PATH =
  "/api/coaching-sales/subscription-cancellation";
const PROGRAM_START_PATH = "/api/coaching-sales/program-start";
const PAYMENT_METHOD_SESSION_PATH =
  "/api/coaching-sales/payment-method-session";
const SUBSCRIPTION_PATHS = [
  SUBSCRIPTION_CANCELLATION_PATH,
  PROGRAM_START_PATH,
  PAYMENT_METHOD_SESSION_PATH,
] as const;

export class PortalRequests {
  constructor(private readonly page: Page) {}

  private async post(path: string, data: unknown): Promise<number> {
    const response = await this.page.request.post(path, { data });

    return response.status();
  }

  private async postForAnswer(path: string): Promise<PortalAnswer> {
    const response = await this.page.request.post(path, { data: {} });
    const text = await response.text();

    return { status: response.status(), body: parsedOrText(text) };
  }

  async openReview(clientId: string): Promise<number> {
    return this.post(REVIEW_OPENINGS_PATH, { clientId });
  }

  async requestDetails(
    clientId: string,
    request: DetailRequestSeed,
  ): Promise<number> {
    return this.post(DETAIL_REQUESTS_PATH, {
      clientId,
      questions: request.questions,
      note: request.note,
    });
  }

  async approveAnswers(clientId: string): Promise<number> {
    return this.post(APPROVALS_PATH, { clientId });
  }

  async resendInvitation(clientId: string): Promise<number> {
    return this.post(INVITATION_RESENDS_PATH, { clientId });
  }

  async answerDetails(answers: AnswersByForm): Promise<number> {
    return this.post(DETAIL_ANSWERS_PATH, { answers });
  }

  async saveOnboardingDraft(): Promise<PortalAnswer> {
    const response = await this.page.request.put(ONBOARDING_DRAFT_PATH, {
      data: { answers: {} },
    });

    return {
      status: response.status(),
      body: parsedOrText(await response.text()),
    };
  }

  async cancelSubscription(): Promise<PortalAnswer> {
    return this.postForAnswer(SUBSCRIPTION_CANCELLATION_PATH);
  }

  async startProgramNow(): Promise<PortalAnswer> {
    return this.postForAnswer(PROGRAM_START_PATH);
  }

  async openPaymentMethod(): Promise<PortalRedirect> {
    const response = await this.page.request.post(PAYMENT_METHOD_SESSION_PATH, {
      form: {},
      maxRedirects: 0,
    });

    return {
      status: response.status(),
      location: response.headers()["location"] ?? null,
    };
  }

  async readSubscriptionRoutes(): Promise<number[]> {
    const statuses: number[] = [];

    for (const path of SUBSCRIPTION_PATHS) {
      statuses.push((await this.page.request.get(path)).status());
    }

    return statuses;
  }
}

function parsedOrText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
