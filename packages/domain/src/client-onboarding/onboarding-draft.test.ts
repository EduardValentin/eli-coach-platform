import { describe, expect, it } from "vitest";

import { emptyAnswers } from "./onboarding-answers";
import { emptyDraft } from "./onboarding-draft";

describe("emptyDraft", () => {
  it("starts on the first form with no answers and no consents", () => {
    // arrange
    const now = new Date("2026-09-28T10:00:00.000Z");

    // act
    const draft = emptyDraft(now);

    // assert
    expect(draft).toEqual({
      answers: emptyAnswers(),
      currentFormIndex: 0,
      consents: {
        specialCategoryAt: null,
        disclaimerAt: null,
        progressPhotosAt: null,
      },
      updatedAt: now,
    });
  });
});
