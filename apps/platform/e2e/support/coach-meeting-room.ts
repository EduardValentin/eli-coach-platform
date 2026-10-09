import { expect, type Page } from "@playwright/test";
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
    await this.scene.page
      .context()
      .route(`${ROOM_ORIGIN}/**`, (route) =>
        route.fulfill({ body: ROOM_PAGE, contentType: "text/html" }),
      );
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
