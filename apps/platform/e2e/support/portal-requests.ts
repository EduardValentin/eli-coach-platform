import type { Page } from "@playwright/test";

import type { DetailRequestSeed } from "./submitted-clients";

type FormAnswers = Record<string, unknown>;

export type AnswersByForm = Record<string, FormAnswers>;

const REVIEW_OPENINGS_PATH = "/api/client-onboarding/review-openings";
const DETAIL_REQUESTS_PATH = "/api/client-onboarding/detail-requests";
const APPROVALS_PATH = "/api/client-onboarding/approvals";
const DETAIL_ANSWERS_PATH = "/api/client-onboarding/detail-answers";
const INVITATION_RESENDS_PATH = "/api/coaching-sales/invitation-resends";

export class PortalRequests {
  constructor(private readonly page: Page) {}

  private async post(path: string, data: unknown): Promise<number> {
    const response = await this.page.request.post(path, { data });

    return response.status();
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
}
