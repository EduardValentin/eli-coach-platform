import { describe, expect, it } from "vitest";

import {
  emptyAnswers,
  type OnboardingAnswersByForm,
  type OnboardingFormAnswers,
} from "./onboarding-answers";
import { coachingSeedOf } from "./onboarding-coaching-seed";

const GOAL_ANSWERS: OnboardingFormAnswers = {
  height: 168,
  weight: 64.5,
  goalWeight: 62,
  primaryGoal: "Lose fat",
  experienceLevel: "I train regularly, but without a structured plan",
  trainingDaysPerWeek: "3 days",
  minutesPerSession: "45–60 minutes",
  lifestyleActivityLevel: "Mostly sitting",
  availableEquipment: ["Full gym", "Dumbbells"],
  trainingPlace: "Gym",
  additionalInfo: "I travel a lot.",
};

const SAFETY_ANSWERS: OnboardingFormAnswers = {
  boneOrJointProblem: "Yes",
  boneOrJointProblemList: "  Right shoulder aches on overhead pressing. ",
};

const COLLABORATION_ANSWERS: OnboardingFormAnswers = {
  eatingStyle: "Vegetarian",
  checkInDay: "Monday",
  checkInChannel: "WhatsApp",
};

const REGULAR_CYCLE: OnboardingFormAnswers = {
  cycleRegularity: "Yes, and it's regular",
  hormonalContraception: "None",
  lifeStage: ["None of these"],
  perimenopauseOrMenopause: "No",
};

function answersWith(
  forms: {
    goal?: OnboardingFormAnswers;
    safety?: OnboardingFormAnswers;
    collaboration?: OnboardingFormAnswers;
    cycle?: OnboardingFormAnswers;
  } = {},
): OnboardingAnswersByForm {
  return {
    ...emptyAnswers(),
    "goal-availability": { ...GOAL_ANSWERS, ...forms.goal },
    "safety-screening": { ...SAFETY_ANSWERS, ...forms.safety },
    "nutrition-lifestyle": { ...COLLABORATION_ANSWERS, ...forms.collaboration },
    "cycle-context": forms.cycle ?? REGULAR_CYCLE,
  };
}

describe("coachingSeedOf", () => {
  it("seeds her coaching facts and preferences from her approved answers", () => {
    // arrange
    const answers = answersWith();

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed).toEqual({
      coaching: {
        heightCm: 168,
        trainingDays: 3,
        sessionMinutes: 60,
        equipment: ["Full gym", "Dumbbells"],
        trainingPlace: "Gym",
        limitations: "Right shoulder aches on overhead pressing.",
        level: "beginner",
        primaryGoal: "Lose fat",
        goalWeightKg: 62,
        activityLevel: "Mostly sitting",
        cycleMode: "adapted",
        dietaryRestrictions: "Vegetarian",
      },
      preferences: {
        preferredCheckInWeekday: "monday",
        preferredChannel: "whatsapp",
      },
    });
  });

  it.each([
    ["New to training", "beginner"],
    ["Returning after a break - 3-6 months", "beginner"],
    ["I train regularly, but without a structured plan", "beginner"],
    ["I train consistently and follow a structured program", "intermediate"],
  ] as const)("reads %s as the %s level", (experienceLevel, level) => {
    // arrange
    const answers = answersWith({ goal: { experienceLevel } });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.coaching.level).toBe(level);
  });

  it.each([
    ["2 days", 2],
    ["3 days", 3],
    ["4 days", 4],
    ["5 or more days", 5],
  ] as const)("reads %s as %d training days", (trainingDaysPerWeek, days) => {
    // arrange
    const answers = answersWith({ goal: { trainingDaysPerWeek } });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.coaching.trainingDays).toBe(days);
  });

  it.each([
    ["Up to 30 minutes", 30],
    ["30–45 minutes", 45],
    ["45–60 minutes", 60],
  ] as const)(
    "reads %s as %d minutes per session",
    (minutesPerSession, minutes) => {
      // arrange
      const answers = answersWith({ goal: { minutesPerSession } });

      // act
      const seed = coachingSeedOf(answers, "female");

      // assert
      expect(seed.coaching.sessionMinutes).toBe(minutes);
    },
  );

  it("falls back to three days of sixty minutes, general cycle mode and no preferences when those answers are missing", () => {
    // arrange
    const answers = answersWith({
      goal: { trainingDaysPerWeek: null, minutesPerSession: null },
      collaboration: { checkInDay: null, checkInChannel: null },
      cycle: {},
    });

    // act
    const seed = coachingSeedOf(answers, "prefer_not_to_say");

    // assert
    expect(seed.coaching).toMatchObject({
      trainingDays: 3,
      sessionMinutes: 60,
      cycleMode: "general",
    });
    expect(seed.preferences).toEqual({
      preferredCheckInWeekday: null,
      preferredChannel: null,
    });
  });

  it("seeds general cycle mode for a man", () => {
    // arrange
    const answers = answersWith();

    // act
    const seed = coachingSeedOf(answers, "male");

    // assert
    expect(seed.coaching.cycleMode).toBe("general");
  });

  it("leaves limitations empty when she has no bone or joint problem, whatever the list holds", () => {
    // arrange
    const answers = answersWith({
      safety: { boneOrJointProblem: "No", boneOrJointProblemList: "Knee" },
    });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.coaching.limitations).toBe("");
  });

  it("keeps only the equipment and place the profile knows and drops bodyweight only beside real equipment", () => {
    // arrange
    const answers = answersWith({
      goal: {
        availableEquipment: [
          "Bodyweight only",
          "Kettlebells",
          "Rowing machine",
        ],
        trainingPlace: "Park",
        lifestyleActivityLevel: "Sometimes",
      },
    });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.coaching).toMatchObject({
      equipment: ["Kettlebells"],
      trainingPlace: null,
      activityLevel: null,
    });
  });

  it("seeds no goal when her answer is not one of the profile's goals", () => {
    // arrange
    const answers = answersWith({ goal: { primaryGoal: "Run a marathon" } });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.coaching.primaryGoal).toBeNull();
  });

  it("reads the email channel and each weekday", () => {
    // arrange
    const answers = answersWith({
      collaboration: { checkInDay: "Sunday", checkInChannel: "Email" },
    });

    // act
    const seed = coachingSeedOf(answers, "female");

    // assert
    expect(seed.preferences).toEqual({
      preferredCheckInWeekday: "sunday",
      preferredChannel: "email",
    });
  });

  it.each([
    [
      "no restrictions and no allergies",
      { eatingStyle: "No restrictions", allergiesOrIntolerances: "No" },
      "None",
    ],
    ["nothing answered about how she eats", { eatingStyle: null }, "None"],
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
    (_label, collaboration, restrictions) => {
      // arrange
      const answers = answersWith({ collaboration });

      // act
      const seed = coachingSeedOf(answers, "female");

      // assert
      expect(seed.coaching.dietaryRestrictions).toBe(restrictions);
    },
  );
});
