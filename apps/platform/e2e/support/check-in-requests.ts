import { expect, type Page } from "@playwright/test";

export type CheckInAnswer = { status: number; body: unknown };

type CheckInNewTime = {
  startsAt: Date;
  note?: string;
  timeZone?: string;
};

type OpenTimesBody = { times: string[] };

export type WeeklyChoice = { weekday: string; hour: number };

const REQUESTS_PATH = "/api/check-ins";
const OPEN_TIMES_PATH = `${REQUESTS_PATH}/open-times`;
const SCHEDULE_PATH = `${REQUESTS_PATH}/schedule`;
const SERIES_PATH = `${REQUESTS_PATH}/series`;
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

  private async openTimesAt(path: string): Promise<Date[]> {
    const response = await this.page.request.get(path);
    expect(response.status()).toBe(OK);
    const { times } = (await response.json()) as OpenTimesBody;

    return times.map((time) => new Date(time));
  }

  async openTimes(): Promise<Date[]> {
    return this.openTimesAt(OPEN_TIMES_PATH);
  }

  async openTimesAnswer(): Promise<CheckInAnswer> {
    const response = await this.page.request.get(OPEN_TIMES_PATH);

    return { status: response.status(), body: await response.json() };
  }

  async openTimesFor(clientId: string): Promise<Date[]> {
    return this.openTimesAt(
      `${OPEN_TIMES_PATH}?${new URLSearchParams({ clientId })}`,
    );
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

  async proposeNewTime(
    checkInId: string,
    newTime: CheckInNewTime,
  ): Promise<CheckInAnswer> {
    return this.answerOf(this.answerPathOf(checkInId, "new-time"), {
      ...newTime,
      startsAt: newTime.startsAt.toISOString(),
    });
  }

  async cancel(checkInId: string): Promise<CheckInAnswer> {
    return this.answerOf(this.answerPathOf(checkInId, "cancellation"), {});
  }

  async setUpSeries(
    clientId: string,
    choice: WeeklyChoice,
  ): Promise<CheckInAnswer> {
    return this.answerOf(SERIES_PATH, { clientId, ...choice });
  }
}
