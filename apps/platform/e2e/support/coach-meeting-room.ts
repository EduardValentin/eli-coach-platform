import { expect, type Page, type Route } from "@playwright/test";
import type pg from "pg";

export type MeetingRoomScene = {
  page: Page;
  pool: pg.Pool;
  scenarioTag: string;
};

type MeetingRoomRow = { url: string | null; updated_at: Date };

const READ_ROOM = `
  select url, updated_at from app.coach_meeting_room where id = 1
`;
const SAVE_ROOM = `
  insert into app.coach_meeting_room (id, url, updated_at)
  values (1, $1, $2)
  on conflict (id) do update
    set url = excluded.url, updated_at = excluded.updated_at
`;
const REMOVE_ROOM = "delete from app.coach_meeting_room where id = 1";
const ROOM_ORIGIN = "https://meet.e2e.invalid";
const ROOM_REDIRECT = 302;
const ROOM_HEADING = "Meeting room";
const ROOM_PAGE = `<!doctype html><title>${ROOM_HEADING}</title><h1>${ROOM_HEADING}</h1>`;
const JOIN_PATHS = "**/checkins/*/join";

export class CoachMeetingRoom {
  readonly url: string;

  private constructor(
    private readonly scene: MeetingRoomScene,
    private readonly previous: MeetingRoomRow | null,
  ) {
    this.url = `${ROOM_ORIGIN}/check-in-${scene.scenarioTag}`;
  }

  static async heldIn(scene: MeetingRoomScene): Promise<CoachMeetingRoom> {
    const { rows } = await scene.pool.query<MeetingRoomRow>(READ_ROOM);

    return new CoachMeetingRoom(scene, rows[0] ?? null);
  }

  async set(): Promise<void> {
    await this.scene.pool.query(SAVE_ROOM, [this.url, new Date()]);
    const context = this.scene.page.context();
    await context.route(`${ROOM_ORIGIN}/**`, (route) =>
      route.fulfill({ body: ROOM_PAGE, contentType: "text/html" }),
    );
    await context.route(JOIN_PATHS, (route) =>
      this.followRedirectToRoom(route),
    );
  }

  // Playwright never routes the target of a server redirect, so the browser
  // is sent on to the room by a navigation of its own once the app chose it.
  private async followRedirectToRoom(route: Route): Promise<void> {
    const response = await route.fetch({ maxRedirects: 0 });

    if (
      response.status() !== ROOM_REDIRECT ||
      response.headers().location !== this.url
    ) {
      await route.fulfill({ response });
      return;
    }

    await route.fulfill({
      body: `<!doctype html><script>location.replace(${JSON.stringify(this.url)})</script>`,
      contentType: "text/html",
    });
  }

  async unset(): Promise<void> {
    await this.scene.pool.query(SAVE_ROOM, [null, new Date()]);
  }

  async expectEntered(): Promise<void> {
    await expect(this.scene.page).toHaveURL(this.url);
    await expect(
      this.scene.page.getByRole("heading", { name: ROOM_HEADING }),
    ).toBeVisible();
  }

  async expectLinkLeadsHere(link: string): Promise<void> {
    const response = await this.scene.page.request.get(link, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(ROOM_REDIRECT);
    expect(response.headers().location).toBe(this.url);
  }

  async restore(): Promise<void> {
    if (!this.previous) {
      await this.scene.pool.query(REMOVE_ROOM);
      return;
    }

    await this.scene.pool.query(SAVE_ROOM, [
      this.previous.url,
      this.previous.updated_at,
    ]);
  }
}
