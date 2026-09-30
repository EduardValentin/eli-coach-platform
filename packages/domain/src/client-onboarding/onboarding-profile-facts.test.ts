import { describe, expect, it } from "vitest";

import {
  emptyAnswers,
  type OnboardingAnswersByForm,
  type OnboardingFormAnswers,
} from "./onboarding-answers";
import { profileFactsOf } from "./onboarding-profile-facts";

function answersWith(forms: {
  goalAvailability?: OnboardingFormAnswers;
  nutritionLifestyle?: OnboardingFormAnswers;
}): OnboardingAnswersByForm {
  return {
    ...emptyAnswers(),
    "goal-availability": forms.goalAvailability ?? {},
    "nutrition-lifestyle": forms.nutritionLifestyle ?? {},
  };
}

describe("profileFactsOf", () => {
  it("takes her height, weight, activity level, goal and notes from her goals form", () => {
    // arrange
    const answers = answersWith({
      goalAvailability: {
        height: 168,
        weight: 64.5,
        lifestyleActivityLevel: "Lightly active",
        primaryGoal: "Lose fat",
        additionalInfo: "  I travel a lot.  ",
      },
      nutritionLifestyle: { eatingStyle: "No restrictions" },
    });

    // act
    const facts = profileFactsOf(answers);

    // assert
    expect(facts).toEqual({
      heightCm: 168,
      startingWeightKg: 64.5,
      activityLevel: "Lightly active",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "None",
      clientNotes: "I travel a lot.",
    });
  });

  it("leaves every goals fact empty when she has not answered them", () => {
    // arrange
    const answers = answersWith({
      goalAvailability: {
        height: "168",
        weight: null,
        lifestyleActivityLevel: 3,
        additionalInfo: "   ",
      },
    });

    // act
    const facts = profileFactsOf(answers);

    // assert
    expect(facts).toEqual({
      heightCm: null,
      startingWeightKg: null,
      activityLevel: null,
      primaryGoal: null,
      dietaryRestrictions: "None",
      clientNotes: null,
    });
  });

  it("trims her activity level and goal, and leaves a blank one empty", () => {
    // arrange
    const answers = answersWith({
      goalAvailability: {
        lifestyleActivityLevel: "  Lightly active ",
        primaryGoal: "   ",
      },
    });

    // act
    const facts = profileFactsOf(answers);

    // assert
    expect([facts.activityLevel, facts.primaryGoal]).toEqual([
      "Lightly active",
      null,
    ]);
  });

  it.each([
    [
      "no restrictions and no allergies",
      { eatingStyle: "No restrictions", allergiesOrIntolerances: "No" },
      "None",
    ],
    ["nothing answered about how she eats", {}, "None"],
    ["her eating style", { eatingStyle: "Vegetarian" }, "Vegetarian"],
    [
      "the eating style she described herself",
      { eatingStyle: "Something else", eatingStyleOther: "  Pescatarian " },
      "Pescatarian",
    ],
    [
      "something else when she did not describe it",
      { eatingStyle: "Something else", eatingStyleOther: "  " },
      "Something else",
    ],
    [
      "her allergies alone",
      {
        eatingStyle: "No restrictions",
        allergiesOrIntolerances: "Yes",
        allergiesOrIntolerancesList: " Lactose, nuts ",
      },
      "Lactose, nuts",
    ],
    [
      "her eating style then her allergies",
      {
        eatingStyle: "Vegan",
        allergiesOrIntolerances: "Yes",
        allergiesOrIntolerancesList: "Gluten",
      },
      "Vegan, Gluten",
    ],
    [
      "no allergies when she said yes but named none",
      {
        eatingStyle: "Vegan",
        allergiesOrIntolerances: "Yes",
        allergiesOrIntolerancesList: "   ",
      },
      "Vegan",
    ],
    [
      "no allergies when she said no, whatever the list holds",
      {
        eatingStyle: "No restrictions",
        allergiesOrIntolerances: "No",
        allergiesOrIntolerancesList: "Gluten",
      },
      "None",
    ],
  ] as const)(
    "joins her dietary restrictions from %s",
    (_label, nutritionLifestyle, restrictions) => {
      // arrange
      const answers = answersWith({ nutritionLifestyle });

      // act
      const facts = profileFactsOf(answers);

      // assert
      expect(facts.dietaryRestrictions).toBe(restrictions);
    },
  );
});
