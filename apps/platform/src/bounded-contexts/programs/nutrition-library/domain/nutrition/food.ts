import type { FoodDraft, FoodDraftSnapshot } from "./food-draft";

export type FoodSnapshot = FoodDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AddedFoodInput = {
  id: string;
  ownerAccountId: string;
  draft: FoodDraft;
  at: Date;
};

export class Food {
  private constructor(private readonly snapshot: FoodSnapshot) {}

  static added(input: AddedFoodInput): Food {
    return new Food({
      id: input.id,
      ownerAccountId: input.ownerAccountId,
      ...input.draft.toSnapshot(),
      archivedAt: null,
      createdAt: input.at,
      updatedAt: input.at,
    });
  }

  static reconstitute(snapshot: FoodSnapshot): Food {
    return new Food({ ...snapshot, tagIds: [...snapshot.tagIds] });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  revised(draft: FoodDraft, at: Date): Food {
    return new Food({
      ...this.snapshot,
      ...draft.toSnapshot(),
      updatedAt: at,
    });
  }

  toSnapshot(): FoodSnapshot {
    return { ...this.snapshot, tagIds: [...this.snapshot.tagIds] };
  }
}
