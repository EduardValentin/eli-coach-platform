export const NUTRITION_TAG_FAMILIES: Readonly<
  Record<string, readonly string[]>
> = {
  "Meal-time": [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snack",
    "Pre-workout",
    "Post-workout",
  ],
  "Cycle phase": ["Menstrual", "Follicular", "Ovulatory", "Luteal"],
  "Nutrient / benefit": [
    "Iron-rich",
    "Omega-3",
    "Magnesium",
    "Anti-inflammatory",
  ],
  Dietary: ["Vegetarian", "Lactose-free"],
};

export const NUTRITION_TAGS = Object.values(NUTRITION_TAG_FAMILIES).flat();
