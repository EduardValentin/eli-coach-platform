import { expect, type Page } from "@playwright/test";

export type CheckInAnswer = { status: number; body: unknown };

type OpenTimesBody = { times: string[] };

const REQUESTS_PATH = "/api/check-ins";
const OPEN_TIMES_PATH = `${REQUESTS_PATH}/open-times`;
const SCHEDULE_PATH = `${REQUESTS_PATH}/schedule`;
const OK = 200;

export class CheckInRequests {
  constructor(private readonly page: Page) {}

  private answerPathOf(checkInId: string, answer: string): string {
    return `${REQUESTS_PATH}/${checkInId}/${answer}`;
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

  async schedule(
    clientId: string,
    startsAt: Date,
    note: string,
  ): Promise<CheckInAnswer> {
    return this.answerOf(SCHEDULE_PATH, {
      clientId,
      startsAt: startsAt.toISOString(),
      note,
    });
  }

  async approve(checkInId: string): Promise<CheckInAnswer> {
    return this.answerOf(this.answerPathOf(checkInId, "approval"), {});
  }

  async decline(checkInId: string, body: object): Promise<CheckInAnswer> {
    return this.answerOf(this.answerPathOf(checkInId, "decline"), body);
  }

  async withdraw(checkInId: string): Promise<CheckInAnswer> {
    return this.answerOf(this.answerPathOf(checkInId, "withdrawal"), {});
  }
}
