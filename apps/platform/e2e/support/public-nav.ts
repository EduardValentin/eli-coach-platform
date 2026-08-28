import { expect, type Page } from "@playwright/test";

export type PortalRole = "CLIENT" | "COACH";

const PORTAL_LABEL: Record<PortalRole, string> = {
  CLIENT: "Client Portal",
  COACH: "Coach Portal",
};

// Drives the always-visible public site header — see
// src/surfaces/public-site/shell/public-navigation.tsx's "header" placement.
// Journeys run at desktop viewport, so the header controls (rather than the
// mobile full-screen overlay's "mobile-menu" placement) are what's visible.
export class PublicNav {
  constructor(private readonly page: Page) {}

  private get signInButton() {
    return this.page.getByRole("button", { name: "Sign In" });
  }

  private get signOutButton() {
    return this.page.getByRole("button", { name: "Sign Out" });
  }

  private portalPill(role: PortalRole) {
    return this.page.getByRole("link", { name: PORTAL_LABEL[role] });
  }

  async signIn(): Promise<void> {
    await this.signInButton.click();
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
    // Sign-out revokes the session and then redirects to the Store, both
    // asynchronously — waiting for the settled, signed-out nav here means
    // every caller gets a real signed-out session rather than a race with a
    // navigation that could cancel the in-flight sign-out request.
    await this.expectSignedOut();
  }

  async openPortal(role: PortalRole): Promise<void> {
    await this.portalPill(role).click();
  }

  async expectSignedOut(): Promise<void> {
    await expect(this.signInButton).toBeVisible();
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.signOutButton).toBeVisible();
  }

  async expectPortalPillVisible(role: PortalRole): Promise<void> {
    await expect(this.portalPill(role)).toBeVisible();
  }
}
