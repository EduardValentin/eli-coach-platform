export class Cart {
  private constructor(readonly slugs: readonly string[]) {}

  static of(slugs: readonly string[]): Cart {
    return new Cart(slugs);
  }

  reconcile(availableSlugs: readonly string[]): Cart {
    const available = new Set(availableSlugs);
    const kept = this.slugs.filter((slug) => available.has(slug));
    return kept.length === this.slugs.length ? this : new Cart(kept);
  }
}
