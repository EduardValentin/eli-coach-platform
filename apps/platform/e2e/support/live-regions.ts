import { expect, type Page } from "@playwright/test";

type Spoken = { where: "drawer" | "page"; hidden: boolean; text: string };

declare global {
  interface Window {
    spokenByLiveRegions?: Spoken[];
  }
}

export class LiveRegions {
  constructor(private readonly page: Page) {}

  async startListening(): Promise<void> {
    await this.page.evaluate(() => {
      const spoken: Spoken[] = [];
      const lastSeen = new WeakMap<Element, string>();
      const record = () => {
        for (const region of document.querySelectorAll('[role="status"]')) {
          const text = region.textContent?.trim() ?? "";
          if (text === (lastSeen.get(region) ?? "")) continue;
          lastSeen.set(region, text);
          if (text === "") continue;
          spoken.push({
            where: region.closest('[role="dialog"]') ? "drawer" : "page",
            hidden: region.closest('[aria-hidden="true"]') !== null,
            text,
          });
        }
      };
      window.spokenByLiveRegions = spoken;
      new MutationObserver(record).observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    });
  }

  async expectSpokenOnce(
    message: string,
    where: "drawer" | "page",
  ): Promise<void> {
    await expect
      .poll(() =>
        this.page.evaluate(
          (text) =>
            (window.spokenByLiveRegions ?? []).filter(
              (entry) => entry.text === text,
            ),
          message,
        ),
      )
      .toEqual([{ hidden: false, text: message, where }]);
  }

  async expectOnlySpeakerIsTheDrawer(): Promise<void> {
    await expect(this.page.getByRole("status")).toHaveCount(1);
    await expect(this.page.getByRole("dialog").getByRole("status")).toHaveCount(
      1,
    );
  }

  async expectOnlySpeakerIsThePage(): Promise<void> {
    await expect(this.page.getByRole("status")).toHaveCount(1);
    await expect(this.page.getByRole("dialog")).toHaveCount(0);
  }
}
