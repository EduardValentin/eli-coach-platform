import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { expect, type Page } from "@playwright/test";

import { AvatarCard } from "./avatar-card";
import { clientPronouns } from "./client-pronouns";
import type { PaidClient } from "./paid-clients";
import { PreferenceRows } from "./preference-rows";
import { ProfileFormSection } from "./profile-form-section";

type ProfileSubject = Pick<PaidClient, "clientId" | "fullName">;

export class CoachClientProfilePage {
  readonly coaching: ProfileFormSection;
  readonly preferences: PreferenceRows;

  constructor(private readonly page: Page) {
    this.coaching = new ProfileFormSection(page, "Coaching");
    this.preferences = new PreferenceRows(page, "Preferences");
  }

  private pathOf(clientId: string): string {
    return `/coach/clients/${clientId}/profile`;
  }

  about(gender: VisitorGender): ProfileFormSection {
    return new ProfileFormSection(
      this.page,
      `About ${clientPronouns(gender).object}`,
    );
  }

  avatar(fullName: string): AvatarCard {
    return new AvatarCard(this.page, fullName);
  }

  async open(clientId: string): Promise<void> {
    await this.page.goto(this.pathOf(clientId));
  }

  async expectOpen(client: ProfileSubject): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`${this.pathOf(client.clientId)}$`),
    );
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Profile" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: `Back to ${client.fullName}` }),
    ).toHaveAttribute("href", `/coach/clients/${client.clientId}`);
  }

  async backToClient(client: ProfileSubject): Promise<void> {
    await this.page
      .getByRole("link", { name: `Back to ${client.fullName}` })
      .click();
    await expect(this.page).toHaveURL(
      new RegExp(`/coach/clients/${client.clientId}$`),
    );
  }
}
