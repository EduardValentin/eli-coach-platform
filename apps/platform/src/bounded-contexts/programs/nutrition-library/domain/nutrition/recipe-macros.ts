export type RecipeMacrosSnapshot = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
};

type PlacedGrams = { foodId: string; grams: number };

type FoodValuesPer100g = RecipeMacrosSnapshot & { id: string };

const NONE: RecipeMacrosSnapshot = { kcal: 0, protein: 0, carb: 0, fat: 0 };

export class RecipeMacros {
  private constructor(private readonly snapshot: RecipeMacrosSnapshot) {}

  static of(
    ingredients: readonly PlacedGrams[],
    foods: readonly FoodValuesPer100g[],
  ): RecipeMacros {
    const foodsById = new Map(foods.map((food) => [food.id, food]));
    const total = ingredients.reduce((sum, { foodId, grams }) => {
      const food = foodsById.get(foodId);

      if (!food) return sum;

      const factor = grams / 100;

      return {
        kcal: sum.kcal + food.kcal * factor,
        protein: sum.protein + food.protein * factor,
        carb: sum.carb + food.carb * factor,
        fat: sum.fat + food.fat * factor,
      };
    }, NONE);

    return new RecipeMacros({
      kcal: Math.round(total.kcal),
      protein: Math.round(total.protein),
      carb: Math.round(total.carb),
      fat: Math.round(total.fat),
    });
  }

  toSnapshot(): RecipeMacrosSnapshot {
    return { ...this.snapshot };
  }
}
