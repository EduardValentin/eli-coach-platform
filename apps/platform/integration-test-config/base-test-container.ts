/**
 * A container declares how the application is told to reach it through
 * `settings`, never how it is faked.
 */
export abstract class BaseTestContainer {
  abstract start(): Promise<void>;

  /** Between test cases, so a suite-scoped container leaves no state behind. */
  abstract reset(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract settings(): Record<string, string>;
}
