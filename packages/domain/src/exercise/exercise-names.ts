export class ExerciseNames {
  private constructor(private readonly names: readonly string[]) {}

  static of(names: readonly string[]): ExerciseNames {
    return new ExerciseNames([...names]);
  }

  includes(name: string): boolean {
    const comparable = this.comparableOf(name);

    return this.names.some((held) => this.comparableOf(held) === comparable);
  }

  private comparableOf(name: string): string {
    return name.trim().toLowerCase();
  }
}
