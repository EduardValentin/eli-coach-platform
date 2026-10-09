import { expect, type Page } from "@playwright/test";

export type CheckInAnswer = { status: number; body: unknown };

type OpenTimesBody = { times: string[] };

const REQUESTS_PATH = "/api/check-ins";
const OPEN_TIMES_PATH = `${REQUESTS_PATH}/open-times`;
const OK = 200;

export class CheckInRequests {
  constructor(private readonly page: Page) {}

  private static approvalPathOf(checkInId: string): string {
    return `${REQUESTS_PATH}/${checkInId}/approval`;
  }

  private async answerOf(path: string, data: unknown): Promise<CheckInAnswer> {
    const response = await this.page.request.post(path, { data });

    return { status: response.status(), body: await response.json() };
  }

  async openTimes(): Promise<Date[]> {
    const response = await this.page.request.get(OPEN_TIMES_PATH);
    expect(response.status()).toBe(OK);
    const { times } = (await response.json()) as OpenTimesBody;

    return times.map((time) => new Date(time));
  }

  async ask(startsAt: Date, timeZone: string): Promise<CheckInAnswer> {
    return this.answerOf(REQUESTS_PATH, {
      startsAt: startsAt.toISOString(),
      timeZone,
    });
  }

  async approve(checkInId: string): Promise<CheckInAnswer> {
    return this.answerOf(CheckInRequests.approvalPathOf(checkInId), {});
  }
}
