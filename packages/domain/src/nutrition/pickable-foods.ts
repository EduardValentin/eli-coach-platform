import type { Food } from "./food";

type PickableFoodsSnapshot = {
  offered: Food[];
  placedOnly: Food[];
};

export class PickableFoods {
  private constructor(private readonly snapshot: PickableFoodsSnapshot) {}

  static of(snapshot: PickableFoodsSnapshot): PickableFoods {
    return new PickableFoods({
      offered: [...snapshot.offered],
      placedOnly: [...snapshot.placedOnly],
    });
  }

  get ids(): string[] {
    return [...this.snapshot.offered, ...this.snapshot.placedOnly].map(
      ({ id }) => id,
    );
  }

  toSnapshot(): PickableFoodsSnapshot {
    return {
      offered: [...this.snapshot.offered],
      placedOnly: [...this.snapshot.placedOnly],
    };
  }
}
